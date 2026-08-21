import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { KnowledgeChunk, ChunkEmbeddingStatus } from '../entities/knowledge-chunk.entity';
import { KnowledgeCatalogEntry } from '../../knowledge/entities/knowledge-catalog.entity';
import { KnowledgeSource } from '../entities/knowledge-source.entity';
import { EngineeringNormalizerService } from '../normalization/engineering-normalizer.service';
import { EngineeringChunkerService } from '../chunking/engineering-chunker.service';
import { EngineeringEmbeddingService } from '../embeddings/engineering-embedding.service';

export interface IndexingBatchSummary {
  tenantId: string;
  catalogEntriesCount: number;
  normalizedRecordsCount: number;
  chunksCreated: number;
  chunksUpdated: number;
  chunksSkipped: number;
  embeddedCount: number;
  embeddingSkipped: number;
  embeddingFailed: number;
  totalActiveChunks: number;
  durationMs: number;
}

@Injectable()
export class KnowledgeIndexingBatchService extends TenantAwareService<KnowledgeChunk> {
  private readonly logger = new Logger(KnowledgeIndexingBatchService.name);

  constructor(
    @InjectRepository(KnowledgeChunk)
    repo: Repository<KnowledgeChunk>,
    @InjectRepository(KnowledgeCatalogEntry)
    private readonly catalogRepo: Repository<KnowledgeCatalogEntry>,
    @InjectRepository(KnowledgeSource)
    private readonly sourceRepo: Repository<KnowledgeSource>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly normalizer: EngineeringNormalizerService,
    private readonly chunker: EngineeringChunkerService,
    private readonly embedder: EngineeringEmbeddingService,
  ) {
    super(repo, 'KnowledgeChunk');
  }

  /**
   * Run end-to-end normalization, chunking, and embedding preparation pipeline.
   */
  async runIndexingPipeline(
    tenantId: string,
    options: {
      embedImmediately?: boolean;
      batchSize?: number;
    } = {},
  ): Promise<IndexingBatchSummary> {
    const scopeTenant = this.requireTenant(tenantId);
    const startTime = Date.now();

    this.logger.log(`Starting M7.2 indexing pipeline for tenant ${scopeTenant}...`);

    // 1. Fetch all catalog entries for tenant
    const catalogEntries = await this.catalogRepo.find({
      where: { tenantId: scopeTenant },
    });

    const sources = await this.sourceRepo.find({
      where: { tenantId: scopeTenant },
    });
    const sourceMap = new Map(sources.map((s) => [s.id, s]));

    // 2. Normalize
    const normalizedRecords = [];
    for (const entry of catalogEntries) {
      const sourceId = entry.sourceRef?.sourceId;
      const source = sourceId ? sourceMap.get(sourceId) : null;
      const normList = this.normalizer.normalizeCatalogEntry(entry, source);
      normalizedRecords.push(...normList);
    }

    // 3. Chunk and persist
    const chunkingRes = await this.chunker.chunkAndPersist(scopeTenant, normalizedRecords);

    // 4. Embed if requested
    let embeddedCount = 0;
    let embeddingSkipped = 0;
    let embeddingFailed = 0;

    if (options.embedImmediately !== false) {
      const embedRes = await this.embedder.embedPendingChunks(scopeTenant, {
        batchSize: options.batchSize || 100,
      });
      embeddedCount = embedRes.embeddedCount;
      embeddingSkipped = embedRes.skippedCount;
      embeddingFailed = embedRes.failedCount;
    }

    const totalActiveChunks = await this.repo.count({
      where: { tenantId: scopeTenant },
    });

    const durationMs = Date.now() - startTime;
    this.logger.log(
      `Indexing pipeline completed in ${(durationMs / 1000).toFixed(2)}s: ${chunkingRes.chunksCreated} chunks created, ${chunkingRes.chunksSkipped} skipped, ${embeddedCount} embedded.`,
    );

    return {
      tenantId: scopeTenant,
      catalogEntriesCount: catalogEntries.length,
      normalizedRecordsCount: normalizedRecords.length,
      chunksCreated: chunkingRes.chunksCreated,
      chunksUpdated: chunkingRes.chunksUpdated,
      chunksSkipped: chunkingRes.chunksSkipped,
      embeddedCount,
      embeddingSkipped,
      embeddingFailed,
      totalActiveChunks,
      durationMs,
    };
  }

  /**
   * Get indexing metrics for tenant.
   */
  async getIndexingStatus(tenantId: string) {
    const scopeTenant = this.requireTenant(tenantId);
    const total = await this.repo.count({ where: { tenantId: scopeTenant } });
    const embedded = await this.repo.count({ where: { tenantId: scopeTenant, embeddingStatus: ChunkEmbeddingStatus.EMBEDDED } });
    const pending = await this.repo.count({ where: { tenantId: scopeTenant, embeddingStatus: ChunkEmbeddingStatus.PENDING } });
    const failed = await this.repo.count({ where: { tenantId: scopeTenant, embeddingStatus: ChunkEmbeddingStatus.FAILED } });

    return {
      tenantId: scopeTenant,
      totalChunks: total,
      embeddedChunks: embedded,
      pendingChunks: pending,
      failedChunks: failed,
      isFullyIndexed: total > 0 && pending === 0 && failed === 0,
    };
  }

  /**
   * Get single chunk by ID.
   */
  async getChunkById(tenantId: string, chunkId: string) {
    const scopeTenant = this.requireTenant(tenantId);
    const chunk = await this.repo.findOne({
      where: { id: chunkId, tenantId: scopeTenant },
    });
    if (!chunk) {
      throw new NotFoundException(`Knowledge chunk not found: ${chunkId}`);
    }
    return chunk;
  }

  /**
   * Retry failed chunks for tenant.
   */
  async retryFailedChunks(tenantId: string) {
    const scopeTenant = this.requireTenant(tenantId);
    const failedChunks = await this.repo.find({
      where: { tenantId: scopeTenant, embeddingStatus: ChunkEmbeddingStatus.FAILED },
    });

    for (const chunk of failedChunks) {
      chunk.embeddingStatus = ChunkEmbeddingStatus.PENDING;
      chunk.errorReason = null;
      await this.repo.save(chunk);
    }

    return this.embedder.embedPendingChunks(scopeTenant);
  }
}
