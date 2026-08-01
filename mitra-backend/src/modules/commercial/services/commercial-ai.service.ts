import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { AiDocumentMetadata } from '../entities/ai-document-metadata.entity';

/**
 * AI-readiness service for the Commercial Domain.
 *
 * Stores document metadata, embeddings placeholders, knowledge references,
 * customer context and project references in a dedicated read model so
 * future AI inference (RFQ summarization, quotation margin guidance,
 * customer 360 insights) can consume a stable context without coupling
 * to transactional tables.
 *
 * No inference is performed — embeddings are reserved placeholders.
 */
@Injectable()
export class CommercialAiService {
  constructor(
    @InjectRepository(AiDocumentMetadata)
    private readonly repo: Repository<AiDocumentMetadata>,
  ) {}

  async syncEntityContext(
    entityType: string,
    entityId: string,
    documentMetadata: Record<string, unknown>,
    userId?: string,
    tenantId?: string | null,
  ): Promise<AiDocumentMetadata> {
    const existing = await this.repo.findOne({
      where: { entityType, entityId, deletedAt: IsNull() },
    });

    const payload = {
      documentMetadata,
      embeddingPlaceholder: {
        model: null,
        dimensions: null,
        vector: null,
        generatedAt: null,
      },
      syncedAt: new Date(),
      ...(userId ? { updatedBy: userId } : {}),
    };

    if (existing) {
      Object.assign(existing, payload);
      return this.repo.save(existing);
    }

    const created = this.repo.create({
      entityType,
      entityId,
      documentMetadata,
      embeddingPlaceholder: {
        model: null,
        dimensions: null,
        vector: null,
        generatedAt: null,
      },
      ...(tenantId ? { tenantId } : {}),
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as unknown as AiDocumentMetadata);
    return this.repo.save(created);
  }

  async setEmbeddingPlaceholder(
    entityType: string,
    entityId: string,
    model: string,
    dimensions: number,
  ): Promise<AiDocumentMetadata> {
    const existing = await this.repo.findOne({
      where: { entityType, entityId, deletedAt: IsNull() },
    });
    if (!existing) {
      throw new Error(`AI context not found for ${entityType}:${entityId}`);
    }
    existing.embeddingPlaceholder = {
      model,
      dimensions,
      vector: null,
      generatedAt: new Date(),
    };

    return this.repo.save(existing);
  }

  async addKnowledgeRef(
    entityType: string,
    entityId: string,
    ref: { type: string; id: string; title?: string; similarity?: number },
  ): Promise<AiDocumentMetadata> {
    const existing = await this.repo.findOne({
      where: { entityType, entityId, deletedAt: IsNull() },
    });
    if (!existing) {
      throw new Error(`AI context not found for ${entityType}:${entityId}`);
    }
    const refs = existing.knowledgeRefs ?? [];
    refs.push(ref as unknown as Record<string, unknown>);
    existing.knowledgeRefs = refs;

    return this.repo.save(existing);
  }

  async getContext(entityType: string, entityId: string, tenantId?: string | null) {
    const where: any = { entityType, entityId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    return this.repo.findOne({ where });
  }

  async listByEntityType(entityType: string, tenantId?: string | null, take = 100) {
    const where: any = { entityType, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    return this.repo.find({ where, take, order: { updatedAt: 'DESC' } });
  }
}
