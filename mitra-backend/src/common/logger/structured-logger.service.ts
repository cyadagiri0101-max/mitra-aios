import { Injectable, LoggerService } from '@nestjs/common';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogRecord {
  ts:       string;
  level:    LogLevel;
  context?: string;
  msg:      string;
  [key: string]: unknown;
}

/**
 * Structured JSON logger compatible with NestJS LoggerService interface.
 *
 * Outputs one JSON object per line (NDJSON / logfmt-style), which is
 * trivially parseable by log aggregators (Loki, Datadog, CloudWatch, etc.).
 *
 * When LOG_PRETTY=true is set (local dev), output is formatted for readability.
 *
 * Usage:
 *   const logger = new Logger(MyService.name);
 *   logger.log('Project created', { projectId: 'p-1' });  // NestJS core API
 *   -- or --
 *   const logger = new StructuredLoggerService();
 *   logger.info('Custom message', { extra: 'data' });
 */
@Injectable()
export class StructuredLoggerService implements LoggerService {
  private readonly pretty: boolean;

  constructor() {
    this.pretty = process.env.LOG_PRETTY === 'true';
  }

  // ── NestJS LoggerService interface ─────────────────────────────────────────

  log(message: any, context?: string): void {
    this.emit('info', message, context);
  }

  error(message: any, trace?: string, context?: string): void {
    const msg = this.extractErrorMessage(message);
    const stack = trace || (message instanceof Error ? message.stack : undefined);
    this.emit('error', msg, context, stack ? { stack } : undefined);
  }

  warn(message: any, context?: string): void {
    this.emit('warn', message, context);
  }

  debug(message: any, context?: string): void {
    this.emit('debug', message, context);
  }

  verbose(message: any, context?: string): void {
    this.emit('debug', message, context);
  }

  // ── Extended API ──────────────────────────────────────────────────────────

  info(message: any, extra?: Record<string, unknown>): void {
    this.emit('info', message, undefined, extra);
  }

  private extractErrorMessage(input: any): string {
    if (input instanceof Error) return input.message;
    if (typeof input === 'string') return input;
    if (input && typeof input === 'object') {
      try {
        return JSON.stringify(input, Object.getOwnPropertyNames(input));
      } catch {
        return String(input);
      }
    }
    return String(input);
  }

  private emit(
    level: LogLevel,
    msg: any,
    context?: string,
    extra?: Record<string, unknown>,
  ): void {
    const text = this.extractErrorMessage(msg);
    const record: LogRecord = {
      ts:      new Date().toISOString(),
      level,
      msg:     text,
      ...(context ? { context } : {}),
      ...(extra   ? extra      : {}),
    };

    const line = this.pretty
      ? `${record.ts} [${level.toUpperCase().padEnd(5)}] ${context ? `[${context}] ` : ''}${msg}${extra ? ' ' + JSON.stringify(extra) : ''}`
      : JSON.stringify(record);

    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
}
