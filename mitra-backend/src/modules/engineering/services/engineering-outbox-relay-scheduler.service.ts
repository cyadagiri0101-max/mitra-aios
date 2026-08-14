import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EngineeringOutboxRelayService } from './engineering-outbox-relay.service';

/**
 * P1-2: automatic outbox delivery for the Engineering Domain. Polls pending
 * outbox rows on an interval so engineering/manufacturing/quality/service
 * events reach the event bus + AI-hook registry without a manual relay call
 * (previously only POST engineering/outbox/relay did this). Guards against
 * overlapping relay cycles.
 *
 * Intervals: MITRA_OUTBOX_RELAY_INTERVAL_MS (default 30s).
 */
@Injectable()
export class EngineeringOutboxRelayScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EngineeringOutboxRelayScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly relayService: EngineeringOutboxRelayService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.intervalMs();
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.timer.unref?.();
    this.logger.log(`Engineering outbox relay scheduler started (interval ${intervalMs}ms)`);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.running) return; // never overlap relay cycles
    this.running = true;
    try {
      const result = await this.relayService.retryAndRelay(100);
      if (result.relayed > 0 || result.rearmed > 0) {
        this.logger.log(`Engineering outbox relay: ${result.relayed} relayed, ${result.failed} failed, ${result.rearmed} re-armed`);
      }
    } catch (err) {
      this.logger.error(`Engineering outbox relay tick failed: ${(err as Error)?.message ?? err}`);
    } finally {
      this.running = false;
    }
  }

  private intervalMs(): number {
    const raw = this.config.get<string>('MITRA_OUTBOX_RELAY_INTERVAL_MS', '30000');
    const ms = Number.parseInt(raw, 10);
    return Number.isFinite(ms) && ms >= 1000 ? ms : 30_000;
  }
}
