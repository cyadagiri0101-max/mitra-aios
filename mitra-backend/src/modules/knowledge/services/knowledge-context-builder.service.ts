import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeCatalogEntry } from '../entities/knowledge-catalog.entity';
import { VectorSearchService } from '@modules/ai/services/vector-search.service';
import { EmbeddingEntityType } from '@modules/ai/entities/knowledge-embedding.entity';

@Injectable()
export class KnowledgeContextBuilderService {
  private readonly logger = new Logger(KnowledgeContextBuilderService.name);

  constructor(
    @InjectRepository(KnowledgeCatalogEntry)
    private readonly catalogRepo: Repository<KnowledgeCatalogEntry>,
    private readonly vectorSearch: VectorSearchService,
  ) {}

  async buildContext(entityType: string, entityId: string, tenantId: string) {
    const catalog = await this.catalogRepo.findOne({
      where: { tenantId, entityType: entityType as any, entityId, deletedAt: null } as any,
    });

    const related = catalog?.searchText
      ? await this.vectorSearch.search(catalog.searchText, tenantId, [this.toEmbeddingType(entityType)], 5)
      : [];

    return {
      entityType,
      entityId,
      catalog: catalog ? {
        title: catalog.title,
        summary: catalog.summary,
        sourceDomain: catalog.sourceDomain,
        tags: catalog.tags ?? [],
        metadata: catalog.sourceRef ?? {},
      } : null,
      relatedDocuments: related.map((item) => ({
        entityType: item.entityType,
        entityId: item.entityId,
        similarity: item.similarity,
        content: item.contentText,
      })),
      revisions: [],
      boms: [],
      routings: [],
      inspections: [],
      serviceHistory: [],
      qualityHistory: [],
      knowledgeArticles: related,
    };
  }

  private toEmbeddingType(entityType: string): EmbeddingEntityType {
    switch (entityType) {
      case 'project': return EmbeddingEntityType.PROJECT;
      case 'service': return EmbeddingEntityType.SERVICE;
      case 'work_order': return EmbeddingEntityType.WORK_ORDER;
      case 'capa': return EmbeddingEntityType.CAPA;
      case 'trial': return EmbeddingEntityType.TRIAL;
      default: return EmbeddingEntityType.KNOWLEDGE;
    }
  }
}
