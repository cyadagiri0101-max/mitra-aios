import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum KnowledgeCatalogEntityType {
  PROJECT = 'project',
  TRIAL = 'trial',
  CAPA = 'capa',
  SERVICE = 'service',
  KNOWLEDGE = 'knowledge',
  WORK_ORDER = 'work_order',
  ANALYTICS = 'analytics',
}

@Entity('knowledge_catalog')
@Index(['tenantId', 'entityType', 'entityId'])
@Index(['sourceDomain', 'deletedAt'])
export class KnowledgeCatalogEntry extends IndustrialBaseEntity {
  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: KnowledgeCatalogEntityType;

  @Column({ name: 'entity_id', type: 'uuid' })
  @Index()
  entityId: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ name: 'source_domain', type: 'varchar', length: 80 })
  sourceDomain: string;

  @Column({ name: 'source_ref', type: 'jsonb', nullable: true })
  sourceRef: Record<string, any> | null;

  @Column({ name: 'tags', type: 'jsonb', nullable: true })
  tags: string[] | null;

  @Column({ name: 'search_text', type: 'text', nullable: true })
  searchText: string | null;

  @Column({ name: 'last_indexed_at', type: 'timestamptz', nullable: true })
  lastIndexedAt: Date | null;

  @Column({ name: 'index_version', type: 'varchar', length: 40, default: '1' })
  indexVersion: string;
}
