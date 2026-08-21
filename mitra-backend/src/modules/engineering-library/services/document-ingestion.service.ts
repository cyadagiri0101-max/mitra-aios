import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { KnowledgeCatalogEntry, KnowledgeCatalogEntityType } from '../../knowledge/entities/knowledge-catalog.entity';
import { KnowledgeSource, KnowledgeSourceType, KnowledgeSourceStatus } from '../entities/knowledge-source.entity';
import { EngineeringLibraryScannerService } from './engineering-library-scanner.service';
import {
  ScanManifest,
  ScannedFileRecord,
  AuthorityStatus,
  EngineeringAssetClassification,
} from '../types/engineering-library-scan.types';

export interface DocumentIngestResult {
  totalEligible: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  durationMs: number;
  documents: {
    relativePath: string;
    action: 'CREATED' | 'UPDATED' | 'SKIPPED' | 'FAILED';
    sourceId?: string;
    error?: string;
  }[];
}

@Injectable()
export class DocumentIngestionService extends TenantAwareService<KnowledgeSource> {
  private readonly logger = new Logger(DocumentIngestionService.name);

  constructor(
    @InjectRepository(KnowledgeSource)
    repo: Repository<KnowledgeSource>,
    @InjectRepository(KnowledgeCatalogEntry)
    private readonly catalogRepo: Repository<KnowledgeCatalogEntry>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly scanner: EngineeringLibraryScannerService,
    private readonly configService: ConfigService,
  ) {
    super(repo, 'KnowledgeSource');
  }

  /**
   * Generate deterministic entity ID for a document.
   */
  generateDeterministicEntityId(tenantId: string, relativePath: string, sha256: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(`${tenantId}:DOC:${relativePath}:${sha256}`)
      .digest('hex');
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
  }

  /**
   * Ingest eligible technical documents from manifest.
   */
  async ingestTechnicalDocuments(
    tenantId: string,
    options: {
      manifest?: ScanManifest;
      manifestPath?: string;
      libraryPath?: string;
      scanBatchId?: string;
    } = {},
  ): Promise<DocumentIngestResult> {
    const scopeTenant = this.requireTenant(tenantId);
    const startTime = Date.now();

    // 1. Resolve manifest
    let manifest = options.manifest;
    if (!manifest) {
      const manifestPath = options.manifestPath || path.resolve(process.cwd(), 'M7_LIBRARY_MANIFEST.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const raw = fs.readFileSync(manifestPath, 'utf-8');
          manifest = JSON.parse(raw) as ScanManifest;
        } catch (err: any) {
          this.logger.warn(`Failed to parse manifest at ${manifestPath}: ${err.message}. Scanning directly.`);
        }
      }
    }

    if (!manifest) {
      manifest = await this.scanner.scanLibrary({
        libraryPath: options.libraryPath,
        computeHashesForEligibleOnly: true,
        batchId: options.scanBatchId,
      });
    }

    const eligibleDocs = manifest.files.filter((f) => f.isEligible && f.classification !== EngineeringAssetClassification.STRUCTURED_DATABASE);
    this.logger.log(`Starting technical document ingestion for tenant ${scopeTenant}: ${eligibleDocs.length} eligible documents.`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const documentResults: DocumentIngestResult['documents'] = [];

    const libRoot = this.scanner.resolveLibraryPath(options.libraryPath);

    for (const doc of eligibleDocs) {
      try {
        const fullPath = path.join(libRoot, doc.relativePath);
        const sha256 = doc.sha256 || (fs.existsSync(fullPath) ? await this.scanner.computeFileSha256(fullPath) : 'unknown');

        let sourceRecord = await this.repo.findOne({
          where: {
            tenantId: scopeTenant,
            sha256,
            relativePath: doc.relativePath,
          },
        });

        let isNewSource = false;
        if (!sourceRecord) {
          sourceRecord = this.repo.create({
            tenantId: scopeTenant,
            sourceType: this.mapClassificationToSourceType(doc.classification),
            sourceFile: doc.fileName,
            relativePath: doc.relativePath,
            sha256,
            fileSize: doc.fileSize,
            lastModified: doc.modifiedAt ? new Date(doc.modifiedAt) : null,
            classification: doc.classification,
            authorityStatus: doc.authorityStatus,
            authorityReason: doc.authorityReason || null,
            projectNumber: doc.provenanceMetadata?.projectNumber || null,
            projectPrefix: doc.provenanceMetadata?.projectPrefix || null,
            customer: doc.provenanceMetadata?.customer || null,
            documentType: doc.provenanceMetadata?.documentType || doc.extension.toUpperCase(),
            machine: doc.provenanceMetadata?.machine || null,
            material: doc.provenanceMetadata?.material || null,
            componentType: doc.provenanceMetadata?.componentType || null,
            revision: doc.revisionCandidate || doc.provenanceMetadata?.revision || null,
            scannerVersion: manifest.scannerVersion,
            scanBatchId: manifest.scanBatchId,
            currentStatus: KnowledgeSourceStatus.ACTIVE,
            firstSeenAt: new Date(),
            lastSeenAt: new Date(),
            metadata: {
              extension: doc.extension,
              directory: doc.directory,
            },
          });
          sourceRecord = await this.repo.save(sourceRecord);
          isNewSource = true;
        } else {
          sourceRecord.lastSeenAt = new Date();
          sourceRecord = await this.repo.save(sourceRecord);
        }

        // Map to KnowledgeCatalogEntry
        const deterministicEntityId = this.generateDeterministicEntityId(scopeTenant, doc.relativePath, sha256);

        const existingCatalogEntry = await this.catalogRepo.findOne({
          where: {
            tenantId: scopeTenant,
            entityType: KnowledgeCatalogEntityType.KNOWLEDGE,
            entityId: deterministicEntityId,
          },
        });

        const { title, summary, tags, searchText } = this.extractDocumentCatalogContent(fullPath, doc);

        if (existingCatalogEntry) {
          if (!isNewSource && existingCatalogEntry.sourceRef?.sha256 === sha256) {
            skipped += 1;
            documentResults.push({ relativePath: doc.relativePath, action: 'SKIPPED', sourceId: sourceRecord.id });
          } else {
            existingCatalogEntry.title = title;
            existingCatalogEntry.summary = summary;
            existingCatalogEntry.sourceDomain = 'DOCUMENT';
            existingCatalogEntry.tags = tags;
            existingCatalogEntry.searchText = searchText;
            existingCatalogEntry.lastIndexedAt = new Date();
            existingCatalogEntry.indexVersion = 'm7.1';
            existingCatalogEntry.sourceRef = {
              sourceId: sourceRecord.id,
              relativePath: doc.relativePath,
              sha256,
              classification: doc.classification,
              authorityStatus: doc.authorityStatus,
              provenance: doc.provenanceMetadata,
            };
            await this.catalogRepo.save(existingCatalogEntry);
            updated += 1;
            documentResults.push({ relativePath: doc.relativePath, action: 'UPDATED', sourceId: sourceRecord.id });
          }
        } else {
          const newCatalogEntry = this.catalogRepo.create({
            tenantId: scopeTenant,
            entityType: KnowledgeCatalogEntityType.KNOWLEDGE,
            entityId: deterministicEntityId,
            title,
            summary,
            sourceDomain: 'DOCUMENT',
            tags,
            searchText,
            lastIndexedAt: new Date(),
            indexVersion: 'm7.1',
            sourceRef: {
              sourceId: sourceRecord.id,
              relativePath: doc.relativePath,
              sha256,
              classification: doc.classification,
              authorityStatus: doc.authorityStatus,
              provenance: doc.provenanceMetadata,
            },
          });
          await this.catalogRepo.save(newCatalogEntry);
          created += 1;
          documentResults.push({ relativePath: doc.relativePath, action: 'CREATED', sourceId: sourceRecord.id });
        }
      } catch (err: any) {
        this.logger.error(`Failed to ingest document ${doc.relativePath}: ${err.message}`);
        failed += 1;
        documentResults.push({ relativePath: doc.relativePath, action: 'FAILED', error: err.message });
      }
    }

    const durationMs = Date.now() - startTime;
    this.logger.log(`Document ingestion complete in ${(durationMs / 1000).toFixed(2)}s: ${created} created, ${updated} updated, ${skipped} skipped, ${failed} failed.`);

    return {
      totalEligible: eligibleDocs.length,
      created,
      updated,
      skipped,
      failed,
      durationMs,
      documents: documentResults,
    };
  }

  private mapClassificationToSourceType(classification: EngineeringAssetClassification): KnowledgeSourceType {
    switch (classification) {
      case EngineeringAssetClassification.MASTER_WORKBOOK:
        return KnowledgeSourceType.MASTER_WORKBOOK;
      case EngineeringAssetClassification.PARSER_SOURCE:
        return KnowledgeSourceType.PARSER_SOURCE;
      case EngineeringAssetClassification.ENGINEERING_DATA:
        return KnowledgeSourceType.SPREADSHEET_DATA;
      case EngineeringAssetClassification.ENGINEERING_DOCUMENT:
      default:
        return KnowledgeSourceType.TECHNICAL_DOCUMENT;
    }
  }

  private extractDocumentCatalogContent(fullPath: string, doc: ScannedFileRecord): { title: string; summary: string; tags: string[]; searchText: string } {
    let title = doc.fileName;
    let summary = `Technical Document: ${doc.relativePath} (${(doc.fileSize / 1024).toFixed(1)} KB)`;
    const tags: string[] = ['DOCUMENT', doc.classification, doc.extension.replace('.', '').toUpperCase()];
    const searchTerms: string[] = [doc.fileName, doc.relativePath];

    if (doc.provenanceMetadata?.projectNumber) {
      tags.push(`PROJECT:${doc.provenanceMetadata.projectNumber}`);
      searchTerms.push(doc.provenanceMetadata.projectNumber);
    }
    if (doc.provenanceMetadata?.customer) {
      tags.push(`CUSTOMER:${doc.provenanceMetadata.customer}`);
      searchTerms.push(doc.provenanceMetadata.customer);
    }
    if (doc.provenanceMetadata?.machine) {
      tags.push(`MACHINE:${doc.provenanceMetadata.machine}`);
      searchTerms.push(doc.provenanceMetadata.machine);
    }

    // If text or markdown file, read snippet
    if (fs.existsSync(fullPath) && (doc.extension === '.md' || doc.extension === '.txt' || doc.extension === '.json')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const firstLines = content.split('\n').filter((l) => l.trim().length > 0).slice(0, 5);
        if (firstLines.length > 0 && firstLines[0].startsWith('#')) {
          title = firstLines[0].replace(/^#+\s*/, '').trim();
        }
        summary = firstLines.join(' ').substring(0, 300);
        searchTerms.push(content.substring(0, 2000));
      } catch {}
    }

    return {
      title,
      summary,
      tags: Array.from(new Set(tags)),
      searchText: searchTerms.join(' '),
    };
  }
}
