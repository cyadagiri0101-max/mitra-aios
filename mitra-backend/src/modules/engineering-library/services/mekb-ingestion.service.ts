import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { DatabaseSync } from 'node:sqlite';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { KnowledgeCatalogEntry, KnowledgeCatalogEntityType } from '../../knowledge/entities/knowledge-catalog.entity';
import { KnowledgeSource, KnowledgeSourceType, KnowledgeSourceStatus } from '../entities/knowledge-source.entity';
import { AuthorityStatus, EngineeringAssetClassification } from '../types/engineering-library-scan.types';

export interface MekbTableIngestResult {
  tableName: string;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  durationMs: number;
  error?: string;
}

export interface MekbDatabaseIngestResult {
  databasePath: string;
  sha256: string;
  sourceId?: string;
  totalTables: number;
  totalRowsRead: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  durationMs: number;
  tableResults: MekbTableIngestResult[];
}

@Injectable()
export class MekbIngestionService extends TenantAwareService<KnowledgeSource> {
  private readonly logger = new Logger(MekbIngestionService.name);

  constructor(
    @InjectRepository(KnowledgeSource)
    repo: Repository<KnowledgeSource>,
    @InjectRepository(KnowledgeCatalogEntry)
    private readonly catalogRepo: Repository<KnowledgeCatalogEntry>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    super(repo, 'KnowledgeSource');
  }

  /**
   * Resolve default SQLite path.
   */
  resolveSqlitePath(overridePath?: string): string {
    if (overridePath) return path.normalize(overridePath);
    const libRoot =
      this.configService.get<string>('MITRA_ENGINEERING_LIBRARY_PATH') ||
      this.configService.get<string>('ENGINEERING_LIBRARY_PATH') ||
      path.resolve(process.cwd(), 'MitraEngineeringLibrary');
    return path.normalize(path.join(libRoot, 'database', 'mekb.sqlite'));
  }

  /**
   * Streaming SHA-256 for SQLite file.
   */
  async computeFileSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }

  /**
   * Generate deterministic UUID v5-style entityId from composite source coordinates.
   */
  generateDeterministicEntityId(tenantId: string, database: string, table: string, pk: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(`${tenantId}:${database}:${table}:${pk}`)
      .digest('hex');
    // Format as 8-4-4-4-12 UUID string
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
  }

  /**
   * Ingest complete MEKB SQLite database in read-only mode.
   */
  async ingestMekbDatabase(
    tenantId: string,
    options: {
      sqlitePath?: string;
      batchSize?: number;
      scanBatchId?: string;
      specificTables?: string[];
    } = {},
  ): Promise<MekbDatabaseIngestResult> {
    const scopeTenant = this.requireTenant(tenantId);
    const dbPath = this.resolveSqlitePath(options.sqlitePath);
    const batchSize = Math.max(50, options.batchSize || 500);

    if (!fs.existsSync(dbPath)) {
      throw new NotFoundException(`MEKB SQLite database not found at path: ${dbPath}`);
    }

    const startTime = Date.now();
    const sha256 = await this.computeFileSha256(dbPath);
    const stats = fs.statSync(dbPath);

    this.logger.log(`Starting read-only MEKB ingestion for tenant ${scopeTenant} from ${dbPath} (SHA-256: ${sha256.substring(0, 12)}...)`);

    // 1. Register or update KnowledgeSource for the SQLite vault
    let sourceRecord = await this.repo.findOne({
      where: {
        tenantId: scopeTenant,
        sha256,
        relativePath: 'database/mekb.sqlite',
      },
    });

    if (!sourceRecord) {
      sourceRecord = this.repo.create({
        tenantId: scopeTenant,
        sourceType: KnowledgeSourceType.MEKB_DATABASE,
        sourceFile: 'mekb.sqlite',
        relativePath: 'database/mekb.sqlite',
        sha256,
        fileSize: stats.size,
        lastModified: stats.mtime,
        classification: EngineeringAssetClassification.STRUCTURED_DATABASE,
        authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
        authorityReason: 'Authoritative MEKB SQLite Database (24 relational tables)',
        documentType: 'DATABASE_RELATIONAL_VAULT',
        scanBatchId: options.scanBatchId || null,
        currentStatus: KnowledgeSourceStatus.ACTIVE,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        metadata: {
          tablesCount: 24,
          ingestionVersion: 'M7.1',
        },
      });
      sourceRecord = await this.repo.save(sourceRecord);
    } else {
      sourceRecord.lastSeenAt = new Date();
      sourceRecord.currentStatus = KnowledgeSourceStatus.ACTIVE;
      sourceRecord = await this.repo.save(sourceRecord);
    }

    // 2. Open SQLite in STRICT READ-ONLY mode
    let sqliteDb: DatabaseSync;
    try {
      sqliteDb = new DatabaseSync(dbPath, { readOnly: true });
    } catch (err: any) {
      throw new BadRequestException(`Failed to open SQLite database in read-only mode: ${err.message}`);
    }

    const tableResults: MekbTableIngestResult[] = [];
    let totalRowsRead = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsSkipped = 0;
    let recordsFailed = 0;

    try {
      const allTablesStmt = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
      const tables = allTablesStmt.all() as { name: string }[];

      for (const { name: tableName } of tables) {
        if (options.specificTables && !options.specificTables.includes(tableName)) {
          continue;
        }

        const tableStart = Date.now();
        let tableCreated = 0;
        let tableUpdated = 0;
        let tableSkipped = 0;
        let tableFailed = 0;

        try {
          const countStmt = sqliteDb.prepare(`SELECT COUNT(*) as cnt FROM "${tableName}";`);
          const countRow = countStmt.get() as { cnt: number };
          const totalInTable = countRow ? countRow.cnt : 0;
          totalRowsRead += totalInTable;

          if (totalInTable > 0) {
            // Read rows in batches
            let offset = 0;
            while (offset < totalInTable) {
              const rowsStmt = sqliteDb.prepare(`SELECT rowid as _rowid_, * FROM "${tableName}" LIMIT ${batchSize} OFFSET ${offset};`);
              const rows = rowsStmt.all() as Record<string, any>[];
              offset += rows.length;

              // Process batch transactionally
              await this.dataSource.transaction(async (manager) => {
                const catalogRepo = manager.getRepository(KnowledgeCatalogEntry);

                for (const row of rows) {
                  const pkValue = String(row.id || row.project_number || row.product_id || row.code || row.name || row._rowid_);
                  const deterministicId = this.generateDeterministicEntityId(scopeTenant, 'mekb.sqlite', tableName, pkValue);

                  const { title, summary, tags, searchText, sourceRef } = this.mapMekbRowToCatalogEntry(tableName, row);

                  // Compute row hash for idempotency check
                  const rowContentHash = crypto.createHash('sha256').update(JSON.stringify(row)).digest('hex');

                  const existing = await catalogRepo.findOne({
                    where: {
                      tenantId: scopeTenant,
                      entityType: KnowledgeCatalogEntityType.KNOWLEDGE,
                      entityId: deterministicId,
                    },
                  });

                  if (existing) {
                    const existingHash = existing.sourceRef?.rowContentHash;
                    if (existingHash === rowContentHash) {
                      tableSkipped += 1;
                    } else {
                      existing.title = title;
                      existing.summary = summary;
                      existing.sourceDomain = 'MEKB';
                      existing.tags = tags;
                      existing.searchText = searchText;
                      existing.lastIndexedAt = new Date();
                      existing.indexVersion = 'm7.1';
                      existing.sourceRef = {
                        ...sourceRef,
                        rowContentHash,
                        database: 'mekb.sqlite',
                        table: tableName,
                        pk: pkValue,
                        sourceId: sourceRecord.id,
                      };
                      await catalogRepo.save(existing);
                      tableUpdated += 1;
                    }
                  } else {
                    const newEntry = catalogRepo.create({
                      tenantId: scopeTenant,
                      entityType: KnowledgeCatalogEntityType.KNOWLEDGE,
                      entityId: deterministicId,
                      title,
                      summary,
                      sourceDomain: 'MEKB',
                      tags,
                      searchText,
                      lastIndexedAt: new Date(),
                      indexVersion: 'm7.1',
                      sourceRef: {
                        ...sourceRef,
                        rowContentHash,
                        database: 'mekb.sqlite',
                        table: tableName,
                        pk: pkValue,
                        sourceId: sourceRecord.id,
                      },
                    });
                    await catalogRepo.save(newEntry);
                    tableCreated += 1;
                  }
                }
              });
            }
          }

          tableResults.push({
            tableName,
            totalRows: totalInTable,
            created: tableCreated,
            updated: tableUpdated,
            skipped: tableSkipped,
            failed: tableFailed,
            durationMs: Date.now() - tableStart,
          });

          recordsCreated += tableCreated;
          recordsUpdated += tableUpdated;
          recordsSkipped += tableSkipped;
          recordsFailed += tableFailed;
        } catch (tblErr: any) {
          this.logger.error(`Error ingesting table ${tableName}: ${tblErr.message}`);
          tableResults.push({
            tableName,
            totalRows: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            failed: 1,
            durationMs: Date.now() - tableStart,
            error: tblErr.message,
          });
          recordsFailed += 1;
        }
      }
    } finally {
      sqliteDb.close();
    }

    const durationMs = Date.now() - startTime;
    this.logger.log(
      `MEKB ingestion complete in ${(durationMs / 1000).toFixed(2)}s: ${recordsCreated} created, ${recordsUpdated} updated, ${recordsSkipped} skipped, ${recordsFailed} failed across ${tableResults.length} tables.`,
    );

    return {
      databasePath: dbPath,
      sha256,
      sourceId: sourceRecord.id,
      totalTables: tableResults.length,
      totalRowsRead,
      recordsCreated,
      recordsUpdated,
      recordsSkipped,
      recordsFailed,
      durationMs,
      tableResults,
    };
  }

  /**
   * Map MEKB row into domain KnowledgeCatalog attributes.
   */
  private mapMekbRowToCatalogEntry(
    tableName: string,
    row: Record<string, any>,
  ): {
    title: string;
    summary: string;
    tags: string[];
    searchText: string;
    sourceRef: Record<string, any>;
  } {
    const tags: string[] = ['MEKB', tableName];
    let title = `${tableName} #${row.id || row._rowid_}`;
    let summary = '';
    const searchTerms: string[] = [tableName];

    switch (tableName) {
      case 'project_master':
        title = `Project ${row.project_number || row.id}: ${row.mold_name || row.project_name || 'Tooling Project'}`;
        summary = `Project ${row.project_number} (${row.prefix || 'Tool'}). Cavitation: ${row.cavitation || 'N/A'}, Machine: ${row.machine_name || 'N/A'}, Customer: ${row.customer_name || 'N/A'}, Product: ${row.product_type || 'N/A'}`;
        if (row.prefix) tags.push(`PREFIX:${row.prefix}`);
        if (row.customer_name) tags.push(`CUSTOMER:${row.customer_name}`);
        if (row.machine_name) tags.push(`MACHINE:${row.machine_name}`);
        break;

      case 'product_master':
        title = `Product: ${row.product_name || row.name || row.id}`;
        summary = `Volume: ${row.volume_ml || row.volume || 'N/A'}ml, Shape: ${row.shape || 'N/A'}, Resin: ${row.resin || 'N/A'}, Overflow: ${row.overflow_volume_ml || 'N/A'}ml`;
        if (row.resin) tags.push(`RESIN:${row.resin}`);
        break;

      case 'cycle_time_history':
        title = `Cycle Time: ${row.machine_name || 'Machine'} (${row.product_weight || 'Weight'}) — ${row.cycle_time || 'N/A'}`;
        summary = `Machine: ${row.machine_name}, Weight: ${row.product_weight}, Cavitation: ${row.cavitation}, Cycle Time: ${row.cycle_time}. Remarks: ${row.remarks || 'None'}`;
        if (row.machine_name) tags.push(`MACHINE:${row.machine_name}`);
        break;

      case 'part_list':
        title = `BOM Part [${row.project_number || 'Tool'}]: ${row.description || 'Component'}`;
        summary = `Item: ${row.item_number || ''} ${row.description}, Material: ${row.material || 'N/A'} Grade: ${row.grade || 'N/A'}, Dim: ${row.finished_sizes || row.length_dia || 'N/A'}, Qty: ${row.qty || 1}, Hardness: ${row.hardness || 'N/A'}`;
        if (row.material) tags.push(`MATERIAL:${row.material}`);
        if (row.grade) tags.push(`GRADE:${row.grade}`);
        if (row.supplier) tags.push(`SUPPLIER:${row.supplier}`);
        break;

      case 'process_planning':
        title = `Process Planning [${row.project_number}]: Step ${row.sequence_number || row.s_no} — ${row.description || row.stage}`;
        summary = `Stage: ${row.stage || 'Planning'}, Activity: ${row.description || row.operation}, Dept: ${row.department || 'Manufacturing'}, Duration: ${row.duration_hours || 'N/A'}h`;
        if (row.department) tags.push(`DEPT:${row.department}`);
        if (row.stage) tags.push(`STAGE:${row.stage}`);
        break;

      case 'component_detail':
        title = `Component: ${row.component_name || row.description} (${row.tool_no || row.project_number})`;
        summary = `Tool: ${row.tool_no}, Component: ${row.component_name}, Material: ${row.material || 'N/A'}, Finished Size: ${row.finished_sizes || 'N/A'}`;
        if (row.material) tags.push(`MATERIAL:${row.material}`);
        break;

      case 'document_index':
        title = `Document Index [${row.project_number || 'Index'}]: Page ${row.page_no || 1} — ${row.description}`;
        summary = `Page: ${row.page_no}, Section: ${row.description}, Remarks: ${row.remarks || 'None'}`;
        break;

      case 'ai_search_tags':
        title = `Search Tag: ${row.tag || row.keyword} (${row.entity_type || 'Entity'})`;
        summary = `Tag: ${row.tag || row.keyword}, Target: ${row.entity_type} #${row.entity_id}, Context: ${row.context || 'General'}`;
        if (row.tag) tags.push(row.tag);
        break;

      default:
        title = `${tableName}: ${row.name || row.code || row.title || row.id || row._rowid_}`;
        summary = Object.entries(row)
          .filter(([k, v]) => v !== null && v !== undefined && k !== '_rowid_')
          .slice(0, 8)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        break;
    }

    // Build comprehensive search terms
    for (const val of Object.values(row)) {
      if (val && typeof val === 'string' && val.trim().length > 1) {
        searchTerms.push(val.trim());
      }
    }

    return {
      title,
      summary,
      tags: Array.from(new Set(tags)),
      searchText: searchTerms.join(' '),
      sourceRef: {
        ...row,
        tableName,
      },
    };
  }
}
