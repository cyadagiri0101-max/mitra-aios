import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { KnowledgeChunk, ChunkEmbeddingStatus } from '../entities/knowledge-chunk.entity';
import { KnowledgeEmbedding, EmbeddingEntityType } from '../../ai/entities/knowledge-embedding.entity';
import { EmbeddingService } from '../../ai/services/embedding.service';

export interface EmbeddingResult {
  totalPending: number;
  embeddedCount: number;
  skippedCount: number;
  failedCount: number;
  durationMs: number;
  dimension: number;
  model: string;
}

@Injectable()
export class EngineeringEmbeddingService extends TenantAwareService<KnowledgeChunk> {
  private readonly logger = new Logger(EngineeringEmbeddingService.name);
  private readonly defaultModel = 'nomic-embed-text';
  private readonly expectedDimensions = 768;

  constructor(
    @InjectRepository(KnowledgeChunk)
    repo: Repository<KnowledgeChunk>,
    @InjectRepository(KnowledgeEmbedding)
    private readonly embeddingRepo: Repository<KnowledgeEmbedding>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly embeddingService: EmbeddingService,
  ) {
    super(repo, 'KnowledgeChunk');
  }

  /**
   * Embed all pending chunks for a tenant in bounded batches.
   */
  async embedPendingChunks(
    tenantId: string,
    options: {
      batchSize?: number;
      maxChunks?: number;
      forceReembed?: boolean;
    } = {},
  ): Promise<EmbeddingResult> {
    const scopeTenant = this.requireTenant(tenantId);
    const batchSize = Math.min(200, Math.max(10, options.batchSize || 50));
    const startTime = Date.now();

    const queryWhere: any = { tenantId: scopeTenant };
    if (!options.forceReembed) {
      queryWhere.embeddingStatus = ChunkEmbeddingStatus.PENDING;
    }

    const pendingChunks = await this.repo.find({
      where: queryWhere,
      take: options.maxChunks || 5000,
      order: { createdAt: 'ASC' },
    });

    this.logger.log(`Found ${pendingChunks.length} chunks to embed for tenant ${scopeTenant}. Batch size: ${batchSize}.`);

    let embeddedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let detectedDimension = this.expectedDimensions;

    for (let i = 0; i < pendingChunks.length; i += batchSize) {
      const batch = pendingChunks.slice(i, i + batchSize);

      for (const chunk of batch) {
        try {
          // Check if vector already exists with identical contentHash
          const existingEmbedding = await this.embeddingRepo.findOne({
            where: {
              tenantId: scopeTenant,
              entityId: chunk.id,
              contentHash: chunk.contentHash,
            },
          });

          if (existingEmbedding && !options.forceReembed) {
            chunk.embeddingStatus = ChunkEmbeddingStatus.EMBEDDED;
            chunk.embeddedAt = new Date();
            chunk.embeddingModel = existingEmbedding.modelName;
            await this.repo.save(chunk);
            skippedCount += 1;
            continue;
          }

          // Generate embedding vector
          const vector = await this.embeddingService.generateEmbedding(chunk.chunkText);

          if (!vector || vector.length === 0) {
            throw new Error('Embedding provider returned null or empty vector');
          }

          if (vector.length !== this.expectedDimensions) {
            detectedDimension = vector.length;
            this.logger.warn(`Detected vector dimension ${vector.length} (expected ${this.expectedDimensions})`);
          }

          // Upsert vector in knowledge_embeddings
          let embeddingRecord = await this.embeddingRepo.findOne({
            where: {
              tenantId: scopeTenant,
              entityId: chunk.id,
            },
          });

          if (!embeddingRecord) {
            embeddingRecord = this.embeddingRepo.create({
              tenantId: scopeTenant,
              entityType: EmbeddingEntityType.KNOWLEDGE,
              entityId: chunk.id,
              contentHash: chunk.contentHash,
              contentText: chunk.chunkText.substring(0, 2000),
              modelName: this.defaultModel,
              embedding: `[${vector.join(',')}]`,
              metadata: {
                chunkId: chunk.id,
                chunkType: chunk.chunkType,
                entityType: chunk.entityType,
                projectNumber: chunk.projectNumber,
                authorityStatus: chunk.authorityStatus,
                structuredMetadata: chunk.structuredMetadata,
              },
            });
          } else {
            embeddingRecord.contentHash = chunk.contentHash;
            embeddingRecord.contentText = chunk.chunkText.substring(0, 2000);
            embeddingRecord.embedding = `[${vector.join(',')}]`;
            embeddingRecord.modelName = this.defaultModel;
            embeddingRecord.metadata = {
              chunkId: chunk.id,
              chunkType: chunk.chunkType,
              entityType: chunk.entityType,
              projectNumber: chunk.projectNumber,
              authorityStatus: chunk.authorityStatus,
              structuredMetadata: chunk.structuredMetadata,
            };
          }

          await this.embeddingRepo.save(embeddingRecord);

          chunk.embeddingStatus = ChunkEmbeddingStatus.EMBEDDED;
          chunk.embeddedAt = new Date();
          chunk.embeddingModel = this.defaultModel;
          chunk.errorReason = null;
          await this.repo.save(chunk);

          embeddedCount += 1;
        } catch (err: any) {
          this.logger.error(`Failed to embed chunk ${chunk.id}: ${err.message}`);
          chunk.embeddingStatus = ChunkEmbeddingStatus.FAILED;
          chunk.errorReason = err.message;
          await this.repo.save(chunk);
          failedCount += 1;
        }
      }
    }

    const durationMs = Date.now() - startTime;
    this.logger.log(
      `Embedding complete in ${(durationMs / 1000).toFixed(2)}s: ${embeddedCount} embedded, ${skippedCount} skipped, ${failedCount} failed.`,
    );

    return {
      totalPending: pendingChunks.length,
      embeddedCount,
      skippedCount,
      failedCount,
      durationMs,
      dimension: detectedDimension,
      model: this.defaultModel,
    };
  }
}
