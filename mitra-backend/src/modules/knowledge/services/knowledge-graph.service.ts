import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeGraphEdge } from '../entities/knowledge-graph-edge.entity';

@Injectable()
export class KnowledgeGraphService {
  private readonly logger = new Logger(KnowledgeGraphService.name);

  constructor(
    @InjectRepository(KnowledgeGraphEdge)
    private readonly repo: Repository<KnowledgeGraphEdge>,
  ) {}

  async synchronizeRelationship(input: {
    tenantId: string;
    sourceType: string;
    sourceId: string;
    targetType: string;
    targetId: string;
    relationshipType: string;
    metadata?: Record<string, any> | null;
  }) {
    const existing = await this.repo.findOne({
      where: {
        tenantId: input.tenantId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        targetType: input.targetType,
        targetId: input.targetId,
        relationshipType: input.relationshipType,
        deletedAt: null,
      } as any,
    });

    if (existing) {
      existing.metadata = input.metadata ?? existing.metadata;
      return this.repo.save(existing);
    }

    const row = this.repo.create({
      tenantId: input.tenantId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      targetType: input.targetType,
      targetId: input.targetId,
      relationshipType: input.relationshipType,
      metadata: input.metadata ?? null,
    });

    return this.repo.save(row);
  }

  async findByEntity(tenantId: string, entityType: string, entityId: string) {
    return this.repo.find({
      where: {
        tenantId,
        deletedAt: null,
        sourceType: entityType,
        sourceId: entityId,
      } as any,
      order: { createdAt: 'DESC' },
    });
  }
}
