import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiAuditLog } from '../entities/ai-audit-log.entity';

export interface AiAuditEntry {
  tenantId?: string | null;
  userId?: string | null;
  userRole?: string | null;
  action: string;
  domain?: string | null;
  task?: string | null;
  promptTemplate?: string | null;
  promptVersion?: string | null;
  provider?: string | null;
  model?: string | null;
  toolsExecuted?: string[];
  citationCount?: number;
  confidence?: number | null;
  inputHash?: string | null;
  injectionFlagged?: boolean;
  processingMs?: number | null;
  status?: string;
  error?: string | null;
}

export interface AiAuditListFilter {
  tenantId: string;
  userId?: string;
  action?: string;
  domain?: string;
  injectionOnly?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Sprint 2.8.2 Phase 6 — dedicated AI audit trail.
 *
 * Records every platform AI request (orchestrated chat, tool execution,
 * prompt management) into the immutable ai_audit_logs table. Recording
 * is fire-and-forget: audit failures never break the advisory pipeline,
 * but they are loudly logged.
 */
@Injectable()
export class AiAuditService {
  private readonly logger = new Logger(AiAuditService.name);

  constructor(
    @InjectRepository(AiAuditLog)
    private readonly repo: Repository<AiAuditLog>,
  ) {}

  async record(entry: AiAuditEntry): Promise<void> {
    try {
      const log = this.repo.create({
        tenantId: entry.tenantId ?? null,
        userId: entry.userId ?? null,
        userRole: entry.userRole ?? null,
        action: entry.action,
        domain: entry.domain ?? null,
        task: entry.task ?? null,
        promptTemplate: entry.promptTemplate ?? null,
        promptVersion: entry.promptVersion ?? null,
        provider: entry.provider ?? null,
        model: entry.model ?? null,
        toolsExecuted: entry.toolsExecuted ?? [],
        citationCount: entry.citationCount ?? 0,
        confidence: entry.confidence ?? null,
        inputHash: entry.inputHash ?? null,
        injectionFlagged: entry.injectionFlagged ?? false,
        processingMs: entry.processingMs ?? null,
        status: entry.status ?? 'SUCCESS',
        error: entry.error ?? null,
      });
      await this.repo.save(log);
    } catch (err: any) {
      this.logger.error(`Failed to write AI audit log (${entry.action}): ${err.message}`);
    }
  }

  async list(filter: AiAuditListFilter) {
    const page = Math.max(1, Number(filter.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(filter.limit ?? 20)));

    const qb = this.repo.createQueryBuilder('a')
      .where('a.tenantId = :tenantId', { tenantId: filter.tenantId });
    if (filter.userId) qb.andWhere('a.userId = :userId', { userId: filter.userId });
    if (filter.action) qb.andWhere('a.action = :action', { action: filter.action });
    if (filter.domain) qb.andWhere('a.domain = :domain', { domain: filter.domain });
    if (filter.injectionOnly) qb.andWhere('a.injectionFlagged = TRUE');
    qb.orderBy('a.createdAt', 'DESC').skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }
}
