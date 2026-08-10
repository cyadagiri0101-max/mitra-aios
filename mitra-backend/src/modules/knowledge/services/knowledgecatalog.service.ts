import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, ILike } from 'typeorm';
import { KnowledgeCatalogEntry, KnowledgeCatalogEntityType } from '../entities/knowledge-catalog.entity';

export interface UpsertCatalogEntryInput {
  tenantId: string | null;
  entityType: KnowledgeCatalogEntityType | string;
  entityId: string;
  title: string;
  summary?: string | null;
  sourceDomain: string;
  sourceRef?: Record<string, any> | null;
  tags?: string[] | null;
  searchText?: string | null;
}

@Injectable()
export class KnowledgeCatalogService {
  private readonly logger = new Logger(KnowledgeCatalogService.name);

  constructor(
    @InjectRepository(KnowledgeCatalogEntry)
    private readonly repo: Repository<KnowledgeCatalogEntry>,
  ) {}

  async upsertCatalogEntry(input: UpsertCatalogEntryInput): Promise<KnowledgeCatalogEntry> {
    const existing = await this.repo.findOne({
      where: {
        tenantId: input.tenantId ?? IsNull(),
        entityType: input.entityType as KnowledgeCatalogEntityType,
        entityId: input.entityId,
        deletedAt: IsNull(),
      },
    });

    const catalog = existing ?? this.repo.create({
      tenantId: input.tenantId,
      entityType: input.entityType as KnowledgeCatalogEntityType,
      entityId: input.entityId,
      sourceDomain: input.sourceDomain,
      indexVersion: '1',
    });

    catalog.title = input.title;
    catalog.summary = input.summary ?? null;
    catalog.sourceRef = input.sourceRef ?? null;
    catalog.tags = input.tags ?? null;
    catalog.searchText = input.searchText ?? this.searchTextFrom(input);
    catalog.lastIndexedAt = new Date();

    return this.repo.save(catalog);
  }

  async findByEntity(tenantId: string, entityType: string, entityId: string): Promise<KnowledgeCatalogEntry | null> {
    return this.repo.findOne({
      where: {
        tenantId,
        entityType: entityType as KnowledgeCatalogEntityType,
        entityId,
        deletedAt: IsNull(),
      },
    });
  }

  async findAll(
    tenantId: string,
    page = 1,
    limit = 20,
    search?: string,
    entityType?: string,
  ) {
    const where: Record<string, any> = { tenantId, deletedAt: IsNull() };
    if (entityType) where.entityType = entityType;

    const [data, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const filtered = search
      ? data.filter((row) => {
          const haystack = `${row.title ?? ''} ${row.summary ?? ''} ${row.searchText ?? ''} ${(row.tags ?? []).join(' ')}`.toLowerCase();
          return haystack.includes(search.toLowerCase());
        })
      : data;

    return { data: filtered, total: filtered.length, page, limit, totalPages: Math.ceil(filtered.length / limit) };
  }

  private searchTextFrom(input: UpsertCatalogEntryInput): string {
    return [input.title, input.summary, input.sourceDomain, ...((input.tags ?? []) || [])]
      .filter(Boolean)
      .join(' ')
      .trim();
  }
}
