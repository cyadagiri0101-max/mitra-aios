import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VectorSearchService } from '@modules/ai/services/vector-search.service';
import { EmbeddingEntityType } from '@modules/ai/entities/knowledge-embedding.entity';
import { KnowledgeCatalogEntry } from '../entities/knowledge-catalog.entity';

export interface KnowledgeSearchOptions {
  query: string;
  tenantId: string;
  types?: EmbeddingEntityType[];
  topK?: number;
  page?: number;
  limit?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class KnowledgeSearchService {
  private readonly logger = new Logger(KnowledgeSearchService.name);

  constructor(
    private readonly vectorSearch: VectorSearchService,
    @InjectRepository(KnowledgeCatalogEntry)
    private readonly catalogRepo: Repository<KnowledgeCatalogEntry>,
  ) {}

  async search(options: KnowledgeSearchOptions) {
    const result = await this.vectorSearch.search(options.query, options.tenantId, options.types, options.topK ?? 8);
    const enriched = await Promise.all(result.map(async (row) => {
      const catalog = await this.catalogRepo.findOne({
        where: {
          tenantId: options.tenantId,
          entityType: row.entityType as any,
          entityId: row.entityId,
          deletedAt: null,
        } as any,
      });

      return {
        ...row,
        title: catalog?.title ?? row.contentText?.slice(0, 120) ?? 'Knowledge item',
        summary: catalog?.summary ?? row.contentText?.slice(0, 250) ?? null,
        sourceDomain: catalog?.sourceDomain ?? row.entityType,
        tags: catalog?.tags ?? [],
        metadata: { ...(catalog?.sourceRef ?? {}), ...(row.metadata ?? {}) },
      };
    }));

    const filtered = this.applyMetadataFilter(enriched, options.metadata);
    const page = Math.max(1, Number(options.page ?? 1));
    const limit = Math.max(1, Math.min(50, Number(options.limit ?? 10)));
    const start = (page - 1) * limit;

    return {
      data: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit) || 1,
    };
  }

  async similar(entityType: EmbeddingEntityType, entityId: string, tenantId: string, topK = 5) {
    const catalog = await this.catalogRepo.findOne({
      where: { tenantId, entityType: entityType as any, entityId, deletedAt: null } as any,
    });
    if (!catalog?.searchText) return { data: [], total: 0 };
    return this.search({
      query: catalog.searchText,
      tenantId,
      types: [entityType],
      topK,
      page: 1,
      limit: topK,
    });
  }

  private applyMetadataFilter(rows: any[], filter?: Record<string, any>) {
    if (!filter || Object.keys(filter).length === 0) return rows;
    return rows.filter((row) => {
      const metadata = row.metadata ?? {};
      return Object.entries(filter).every(([key, value]) => {
        if (value === undefined || value === null || value === '') return true;
        return metadata[key] === value;
      });
    });
  }
}
