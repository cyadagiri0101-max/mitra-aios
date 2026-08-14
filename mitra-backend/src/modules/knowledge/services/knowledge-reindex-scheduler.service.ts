import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Tenant } from '@modules/platform/entities/tenant.entity';
import { EmbeddingService } from '@modules/ai/services/embedding.service';

/**
 * P1-2: automatic full-sync knowledge indexing. Runs `indexTenantData` for
 * every active tenant on a periodic interval so trial/CAPA/project/knowledge/
 * commercial records stay embedded even when no domain event was emitted
 * (backfills, bulk imports, legacy data). Event-driven incremental indexing
 * remains the primary path (outbox → event bus → KnowledgeIndexingService);
 * this scheduler is the safety net. Guards against overlapping runs.
 *
 * Intervals:
 *   MITRA_KNOWLEDGE_REINDEX_INTERVAL_MS   (default 6h)
 *   MITRA_KNOWLEDGE_REINDEX_INITIAL_DELAY_MS (default 60s)
 */
@Injectable()
export class KnowledgeReindexSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KnowledgeReindexSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private initialTimer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly embedding: EmbeddingService,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.intervalMs('MITRA_KNOWLEDGE_REINDEX_INTERVAL_MS', 6 * 60 * 60 * 1000);
    const initialDelayMs = this.intervalMs('MITRA_KNOWLEDGE_REINDEX_INITIAL_DELAY_MS', 60_000);
    this.initialTimer = setTimeout(() => void this.tick(), initialDelayMs);
    this.initialTimer.unref?.();
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.timer.unref?.();
    this.logger.log(`Knowledge reindex scheduler started (initial ${initialDelayMs}ms, interval ${intervalMs}ms)`);
  }

  onModuleDestroy(): void {
    if (this.initialTimer) {
      clearTimeout(this.initialTimer);
      this.initialTimer = null;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick(): Promise<void> {
    if (this.running) return; // never overlap reindex cycles
    this.running = true;
    try {
      const tenants = await this.tenantRepo.find({ where: { isActive: true, deletedAt: IsNull() } });
      for (const tenant of tenants) {
        try {
          const result = await this.embedding.indexTenantData(tenant.id, this.dataSource);
          this.logger.log(
            `Reindex tenant ${tenant.id} (${tenant.name}): ${result.indexed} indexed, ${result.skipped} skipped, ${result.errors} errors`,
          );
        } catch (err) {
          this.logger.error(`Reindex failed for tenant ${tenant.id}: ${(err as Error)?.message ?? err}`);
        }
      }
    } catch (err) {
      this.logger.error(`Knowledge reindex tick failed: ${(err as Error)?.message ?? err}`);
    } finally {
      this.running = false;
    }
  }

  private intervalMs(key: string, fallback: number): number {
    const raw = this.config.get<string>(key, String(fallback));
    const ms = Number.parseInt(raw, 10);
    return Number.isFinite(ms) && ms >= 1000 ? ms : fallback;
  }
}
