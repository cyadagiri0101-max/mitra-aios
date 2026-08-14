import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommercialOutboxRelayService } from './commercial-outbox-relay.service';

/**
 * P1-2: automatic outbox delivery for the Commercial Domain. Polls pending
 * outbox rows on an interval so commercial events reach the event bus (and
 * downstream consumers such as knowledge indexing) without a manual relay
 * call. Mirrors the Engineering relay scheduler — both share the same
 * transactional outbox (G-13) and per-domain in-process buses.
 *
 * Intervals: MITRA_COMMERCIAL_RELAY_INTERVAL_MS (default 30s).
 */
@Injectable()
export class CommercialOutboxRelayScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CommercialOutboxRelayScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly relayService: CommercialOutboxRelayService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.intervalMs();
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.timer.unref?.();
    this.logger.log(`Commercial outbox relay scheduler started (interval ${intervalMs}ms)`);
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
        this.logger.log(`Commercial outbox relay: ${result.relayed} relayed, ${result.failed} failed, ${result.rearmed} re-armed`);
      }
    } catch (err) {
      this.logger.error(`Commercial outbox relay tick failed: ${(err as Error)?.message ?? err}`);
    } finally {
      this.running = false;
    }
  }

  private intervalMs(): number {
    const raw = this.config.get<string>('MITRA_COMMERCIAL_RELAY_INTERVAL_MS', '30000');
    const ms = Number.parseInt(raw, 10);
    return Number.isFinite(ms) && ms >= 1000 ? ms : 30_000;
  }
}
