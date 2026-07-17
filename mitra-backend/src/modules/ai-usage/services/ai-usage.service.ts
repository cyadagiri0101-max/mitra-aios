import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AiUsageRecord } from '../entities/ai-usage-record.entity';
import { AiUsageDto, AiUsageSummaryDto } from '../dto/ai-usage.dto';

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(
    @InjectRepository(AiUsageRecord)
    private readonly usageRepo: Repository<AiUsageRecord>,
  ) {}

  async trackUsage(dto: AiUsageDto): Promise<AiUsageRecord> {
    const record = this.usageRepo.create({
      userId: dto.userId,
      tenantId: dto.tenantId ?? null,
      prompt: dto.prompt,
      modelName: dto.modelName,
      responseTimeMs: dto.responseTimeMs ?? null,
      tokenEstimate: dto.tokenEstimate ?? null,
    });

    const saved = await this.usageRepo.save(record);
    this.logger.log(`AI usage tracked: user=${dto.userId}, model=${dto.modelName}, time=${dto.responseTimeMs}ms`);
    return saved;
  }

  async getStats(tenantId?: string, days = 7): Promise<AiUsageSummaryDto> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const where: any = { createdAt: Between(start, end) };
    if (tenantId) where.tenantId = tenantId;

    const records = await this.usageRepo.find({ where });

    const totalCalls = records.length;
    const totalTokens = records.reduce((sum, r) => sum + (r.tokenEstimate ?? 0), 0);
    const avgResponseTime = totalCalls > 0
      ? Math.round(records.reduce((sum, r) => sum + (r.responseTimeMs ?? 0), 0) / totalCalls)
      : 0;

    const callsByModel: Record<string, number> = {};
    for (const r of records) {
      callsByModel[r.modelName] = (callsByModel[r.modelName] ?? 0) + 1;
    }

    return {
      totalCalls,
      totalTokens,
      averageResponseTimeMs: avgResponseTime,
      callsByModel,
      periodStart: start,
      periodEnd: end,
    };
  }

  async getUserUsage(userId: string, tenantId?: string, days = 30): Promise<AiUsageSummaryDto> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const where: any = { userId, createdAt: Between(start, end) };
    if (tenantId) where.tenantId = tenantId;

    const records = await this.usageRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    const totalCalls = records.length;
    const totalTokens = records.reduce((sum, r) => sum + (r.tokenEstimate ?? 0), 0);
    const avgResponseTime = totalCalls > 0
      ? Math.round(records.reduce((sum, r) => sum + (r.responseTimeMs ?? 0), 0) / totalCalls)
      : 0;

    const callsByModel: Record<string, number> = {};
    for (const r of records) {
      callsByModel[r.modelName] = (callsByModel[r.modelName] ?? 0) + 1;
    }

    return {
      totalCalls,
      totalTokens,
      averageResponseTimeMs: avgResponseTime,
      callsByModel,
      periodStart: start,
      periodEnd: end,
    };
  }

  async getUserRecords(userId: string, limit = 100): Promise<AiUsageRecord[]> {
    return this.usageRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
