import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('search_indexes')
@Index(['entityType', 'entityId', 'deletedAt'])
export class SearchIndex extends IndustrialBaseEntity {
  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  @Index()
  entityId: string;

  @Column({ name: 'display_title', type: 'varchar', length: 300 })
  displayTitle: string;

  @Column({ name: 'searchable_text', type: 'text' })
  searchableText: string;

  @Column({ name: 'keywords', type: 'jsonb', nullable: true })
  keywords: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ name: 'url_path', type: 'varchar', length: 300, nullable: true })
  urlPath: string | null;

  @Column({ name: 'indexed_at', type: 'timestamptz', nullable: true })
  indexedAt: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}