import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    const host     = configService.get<string>('REDIS_HOST', 'localhost');
    const port     = configService.get<number>('REDIS_PORT', 6379);
    const password = configService.get<string>('REDIS_PASSWORD', '');

    this.client = createClient({
      socket: { host, port },
      // Only pass password when set — avoids "ERR Client sent AUTH, but no password is set" on dev
      ...(password ? { password } : {}),
    }) as RedisClientType;

    this.client.on('error',      (err) => this.logger.error('Redis error:', err));
    this.client.on('connect',    () => { this.isConnected = true;  this.logger.log('Redis connected');    });
    this.client.on('disconnect', () => { this.isConnected = false; this.logger.warn('Redis disconnected'); });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
    } catch (err: any) {
      // Redis is non-fatal — app works without it (cache misses, throttling disabled)
      this.logger.warn(`Redis unavailable (non-fatal): ${err.message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.isConnected) {
      try { await this.client.quit(); } catch { /* ignore */ }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;
    try {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch { return null; }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err: any) {
      this.logger.warn(`Redis set failed: ${err.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) return;
    try { await this.client.del(key); } catch { /* silent */ }
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) await this.client.del(keys);
    } catch { /* silent */ }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) return false;
    try { return (await this.client.exists(key)) > 0; } catch { return false; }
  }

  async incr(key: string): Promise<number> {
    if (!this.isConnected) return 0;
    try { return await this.client.incr(key); } catch { return 0; }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.isConnected) return;
    try { await this.client.expire(key, ttlSeconds); } catch { /* silent */ }
  }
}
