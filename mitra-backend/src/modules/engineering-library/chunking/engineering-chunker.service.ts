import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { KnowledgeChunk, ChunkEmbeddingStatus } from '../entities/knowledge-chunk.entity';
import { NormalizedEngineeringRecord } from '../normalization/engineering-normalizer.service';

export interface ChunkingResult {
  totalProcessed: number;
  chunksCreated: number;
  chunksUpdated: number;
  chunksSkipped: number;
  chunksFailed: number;
  durationMs: number;
}

@Injectable()
export class EngineeringChunkerService extends TenantAwareService<KnowledgeChunk> {
  private readonly logger = new Logger(EngineeringChunkerService.name);

  constructor(
    @InjectRepository(KnowledgeChunk)
    repo: Repository<KnowledgeChunk>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super(repo, 'KnowledgeChunk');
  }

  /**
   * Generate deterministic UUID v5-style chunk ID.
   */
  generateDeterministicChunkId(
    tenantId: string,
    sourceId: string | null,
    entityType: string,
    entityId: string,
    chunkType: string,
    chunkOrdinal: number,
  ): string {
    const raw = `${tenantId}:${sourceId || 'nosrc'}:${entityType}:${entityId}:${chunkType}:${chunkOrdinal}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
  }

  /**
   * Compute deterministic SHA-256 hash of normalized text and core metadata coordinates.
   */
  computeChunkContentHash(tenantId: string, normalizedText: string, metadata: Record<string, any>): string {
    const metaString = JSON.stringify(metadata || {});
    return crypto.createHash('sha256').update(`${tenantId}:${normalizedText.trim()}:${metaString}`).digest('hex');
  }

  /**
   * Convert normalized engineering records into persisted KnowledgeChunk entities.
   */
  async chunkAndPersist(tenantId: string, normalizedRecords: NormalizedEngineeringRecord[]): Promise<ChunkingResult> {
    const scopeTenant = this.requireTenant(tenantId);
    const startTime = Date.now();

    let chunksCreated = 0;
    let chunksUpdated = 0;
    let chunksSkipped = 0;
    let chunksFailed = 0;

    for (const record of normalizedRecords) {
      try {
        const subChunks = this.splitRecordIntoSubChunks(record);

        for (let ordinal = 0; ordinal < subChunks.length; ordinal += 1) {
          const chunkText = subChunks[ordinal];
          const contentHash = this.computeChunkContentHash(scopeTenant, chunkText, record.structuredMetadata);
          const deterministicId = this.generateDeterministicChunkId(
            scopeTenant,
            record.sourceId,
            record.entityType,
            record.entityId,
            record.chunkType,
            ordinal,
          );

          const existing = await this.repo.findOne({
            where: {
              tenantId: scopeTenant,
              contentHash,
            },
          });

          if (existing) {
            chunksSkipped += 1;
            continue;
          }

          // Check if record exists by deterministic coordinates (meaning content was updated)
          const existingCoord = await this.repo.findOne({
            where: {
              tenantId: scopeTenant,
              entityId: record.entityId,
              chunkType: record.chunkType,
              chunkOrdinal: ordinal,
            },
          });

          if (existingCoord) {
            existingCoord.contentHash = contentHash;
            existingCoord.chunkText = chunkText;
            existingCoord.structuredMetadata = record.structuredMetadata;
            existingCoord.embeddingStatus = ChunkEmbeddingStatus.PENDING; // Needs re-embedding
            existingCoord.authorityStatus = record.authorityStatus;
            existingCoord.projectNumber = record.projectNumber;
            existingCoord.projectPrefix = record.projectPrefix;
            existingCoord.customer = record.customer;
            existingCoord.machine = record.machine;
            existingCoord.material = record.material;
            existingCoord.revision = record.revision;
            await this.repo.save(existingCoord);
            chunksUpdated += 1;
          } else {
            const newChunk = this.repo.create({
              id: deterministicId,
              tenantId: scopeTenant,
              sourceId: record.sourceId,
              sourceType: record.sourceType,
              entityType: record.entityType,
              entityId: record.entityId,
              chunkType: record.chunkType,
              chunkOrdinal: ordinal,
              projectNumber: record.projectNumber,
              projectPrefix: record.projectPrefix,
              customer: record.customer,
              machine: record.machine,
              material: record.material,
              revision: record.revision,
              authorityStatus: record.authorityStatus,
              relativePath: record.relativePath,
              sourceFile: record.sourceFile,
              sourceSheet: record.sourceSheet,
              sourceRow: record.sourceRow,
              sourcePage: record.sourcePage,
              contentHash,
              chunkText,
              structuredMetadata: record.structuredMetadata,
              embeddingStatus: ChunkEmbeddingStatus.PENDING,
            });
            await this.repo.save(newChunk);
            chunksCreated += 1;
          }
        }
      } catch (err: any) {
        this.logger.error(`Failed to chunk record ${record.entityId} (${record.entityType}): ${err.message}`);
        chunksFailed += 1;
      }
    }

    const durationMs = Date.now() - startTime;
    this.logger.log(
      `Chunking completed in ${(durationMs / 1000).toFixed(2)}s: ${chunksCreated} created, ${chunksUpdated} updated, ${chunksSkipped} skipped, ${chunksFailed} failed.`,
    );

    return {
      totalProcessed: normalizedRecords.length,
      chunksCreated,
      chunksUpdated,
      chunksSkipped,
      chunksFailed,
      durationMs,
    };
  }

  /**
   * Split a large normalized record into bounded sub-chunks if text exceeds ~2,000 characters.
   */
  private splitRecordIntoSubChunks(record: NormalizedEngineeringRecord): string[] {
    const text = record.normalizedText.trim();
    if (text.length <= 2500) {
      return [text];
    }

    // Split Markdown documents or large texts by section headings or paragraphs
    const paragraphs = text.split('\n\n');
    const chunks: string[] = [];
    let currentChunk = '';
    const headerPrefix = `[Document Context: ${record.title} | Path: ${record.relativePath || 'N/A'}]\n\n`;

    for (const p of paragraphs) {
      if (currentChunk.length + p.length > 2000 && currentChunk.trim().length > 0) {
        chunks.push(chunks.length === 0 ? currentChunk.trim() : headerPrefix + currentChunk.trim());
        currentChunk = '';
      }
      currentChunk += (currentChunk ? '\n\n' : '') + p;
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(chunks.length === 0 ? currentChunk.trim() : headerPrefix + currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }
}
