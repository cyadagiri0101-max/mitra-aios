import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { KnowledgeIngestionBatch, IngestionBatchStatus } from '../entities/knowledge-ingestion-batch.entity';
import { KnowledgeIngestionItem, IngestionItemStatus } from '../entities/knowledge-ingestion-item.entity';
import { MekbIngestionService } from './mekb-ingestion.service';
import { DocumentIngestionService } from './document-ingestion.service';
import { EngineeringLibraryScannerService } from './engineering-library-scanner.service';

export interface StartIngestionBatchOptions {
  libraryPath?: string;
  scanBatchId?: string;
  ingestDatabase?: boolean;
  ingestDocuments?: boolean;
}

@Injectable()
export class KnowledgeIngestionBatchService extends TenantAwareService<KnowledgeIngestionBatch> {
  private readonly logger = new Logger(KnowledgeIngestionBatchService.name);

  constructor(
    @InjectRepository(KnowledgeIngestionBatch)
    repo: Repository<KnowledgeIngestionBatch>,
    @InjectRepository(KnowledgeIngestionItem)
    private readonly itemRepo: Repository<KnowledgeIngestionItem>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly mekbIngestion: MekbIngestionService,
    private readonly documentIngestion: DocumentIngestionService,
    private readonly scanner: EngineeringLibraryScannerService,
  ) {
    super(repo, 'KnowledgeIngestionBatch');
  }

  /**
   * Start and orchestrate an end-to-end ingestion batch for a tenant.
   */
  async executeIngestionBatch(tenantId: string, options: StartIngestionBatchOptions = {}): Promise<KnowledgeIngestionBatch> {
    const scopeTenant = this.requireTenant(tenantId);
    const shouldIngestDb = options.ingestDatabase !== false;
    const shouldIngestDocs = options.ingestDocuments !== false;

    this.logger.log(`Starting M7.1 Ingestion Batch for tenant ${scopeTenant}...`);

    // 1. Create Batch Record
    const batch = this.repo.create({
      tenantId: scopeTenant,
      scanBatchId: options.scanBatchId || null,
      status: IngestionBatchStatus.RUNNING,
      startedAt: new Date(),
      totalCandidates: (shouldIngestDb ? 24 : 0) + (shouldIngestDocs ? 49 : 0),
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      metadata: {
        ingestDatabase: shouldIngestDb,
        ingestDocuments: shouldIngestDocs,
      },
    });
    const savedBatch = await this.repo.save(batch);

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    let totalSucceeded = 0;
    const errors: string[] = [];

    try {
      // 2. Ingest MEKB SQLite Database
      if (shouldIngestDb) {
        const dbItem = this.itemRepo.create({
          tenantId: scopeTenant,
          batchId: savedBatch.id,
          sourceIdentifier: 'database/mekb.sqlite',
          sourceType: 'SQLITE_DATABASE',
          status: IngestionItemStatus.PROCESSING,
          startedAt: new Date(),
        });
        await this.itemRepo.save(dbItem);

        try {
          const dbResult = await this.mekbIngestion.ingestMekbDatabase(scopeTenant, {
            scanBatchId: options.scanBatchId,
          });

          dbItem.sourceId = dbResult.sourceId || null;
          dbItem.status = IngestionItemStatus.SUCCESS;
          dbItem.completedAt = new Date();
          dbItem.recordsCreated = dbResult.recordsCreated;
          dbItem.recordsUpdated = dbResult.recordsUpdated;
          dbItem.recordsSkipped = dbResult.recordsSkipped;
          dbItem.metadata = {
            tablesCount: dbResult.totalTables,
            rowsRead: dbResult.totalRowsRead,
          };
          await this.itemRepo.save(dbItem);

          totalCreated += dbResult.recordsCreated;
          totalUpdated += dbResult.recordsUpdated;
          totalSkipped += dbResult.recordsSkipped;
          totalSucceeded += 1;
        } catch (dbErr: any) {
          this.logger.error(`MEKB database ingestion failed: ${dbErr.message}`);
          dbItem.status = IngestionItemStatus.FAILED;
          dbItem.completedAt = new Date();
          dbItem.errorCode = 'SQLITE_INGESTION_ERROR';
          dbItem.errorMessage = dbErr.message;
          await this.itemRepo.save(dbItem);

          totalFailed += 1;
          errors.push(`Database: ${dbErr.message}`);
        }
      }

      // 3. Ingest Technical Documents
      if (shouldIngestDocs) {
        const docItem = this.itemRepo.create({
          tenantId: scopeTenant,
          batchId: savedBatch.id,
          sourceIdentifier: 'technical_documents_manifest',
          sourceType: 'DOCUMENT_VAULT',
          status: IngestionItemStatus.PROCESSING,
          startedAt: new Date(),
        });
        await this.itemRepo.save(docItem);

        try {
          const docResult = await this.documentIngestion.ingestTechnicalDocuments(scopeTenant, {
            libraryPath: options.libraryPath,
            scanBatchId: options.scanBatchId,
          });

          docItem.status = IngestionItemStatus.SUCCESS;
          docItem.completedAt = new Date();
          docItem.recordsCreated = docResult.created;
          docItem.recordsUpdated = docResult.updated;
          docItem.recordsSkipped = docResult.skipped;
          docItem.metadata = {
            totalEligible: docResult.totalEligible,
            failedCount: docResult.failed,
          };
          await this.itemRepo.save(docItem);

          totalCreated += docResult.created;
          totalUpdated += docResult.updated;
          totalSkipped += docResult.skipped;
          totalSucceeded += 1;
        } catch (docErr: any) {
          this.logger.error(`Technical document ingestion failed: ${docErr.message}`);
          docItem.status = IngestionItemStatus.FAILED;
          docItem.completedAt = new Date();
          docItem.errorCode = 'DOCUMENT_INGESTION_ERROR';
          docItem.errorMessage = docErr.message;
          await this.itemRepo.save(docItem);

          totalFailed += 1;
          errors.push(`Documents: ${docErr.message}`);
        }
      }

      // 4. Update Batch Final State
      savedBatch.completedAt = new Date();
      savedBatch.processed = totalSucceeded + totalFailed;
      savedBatch.succeeded = totalSucceeded;
      savedBatch.failed = totalFailed;
      savedBatch.skipped = totalSkipped;
      savedBatch.recordsCreated = totalCreated;
      savedBatch.recordsUpdated = totalUpdated;
      savedBatch.status = totalFailed === 0 ? IngestionBatchStatus.COMPLETED : (totalSucceeded > 0 ? IngestionBatchStatus.PARTIAL : IngestionBatchStatus.FAILED);
      savedBatch.errorSummary = errors.length > 0 ? errors.join('; ') : null;

      const finalBatch = await this.repo.save(savedBatch);
      this.logger.log(`Ingestion Batch ${finalBatch.id} completed with status: ${finalBatch.status} (${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped)`);
      return finalBatch;
    } catch (err: any) {
      savedBatch.status = IngestionBatchStatus.FAILED;
      savedBatch.completedAt = new Date();
      savedBatch.errorSummary = err.message;
      return this.repo.save(savedBatch);
    }
  }

  /**
   * List batches for tenant.
   */
  async listBatches(tenantId: string, limit = 20): Promise<KnowledgeIngestionBatch[]> {
    const scopeTenant = this.requireTenant(tenantId);
    return this.repo.find({
      where: { tenantId: scopeTenant },
      order: { startedAt: 'DESC' },
      take: Math.min(50, limit),
      relations: ['items'],
    });
  }

  /**
   * Get single batch with items.
   */
  async getBatch(tenantId: string, batchId: string): Promise<KnowledgeIngestionBatch> {
    const scopeTenant = this.requireTenant(tenantId);
    const batch = await this.repo.findOne({
      where: { id: batchId, tenantId: scopeTenant },
      relations: ['items'],
    });
    if (!batch) {
      throw new NotFoundException(`Ingestion batch not found: ${batchId}`);
    }
    return batch;
  }

  /**
   * Get latest batch status.
   */
  async getLatestBatchStatus(tenantId: string): Promise<KnowledgeIngestionBatch | null> {
    const scopeTenant = this.requireTenant(tenantId);
    return this.repo.findOne({
      where: { tenantId: scopeTenant },
      order: { startedAt: 'DESC' },
      relations: ['items'],
    });
  }
}
