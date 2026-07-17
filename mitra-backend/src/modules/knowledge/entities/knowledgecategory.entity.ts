import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('knowledge_categories')
@Index(['slug', 'deletedAt'])
export class KnowledgeCategory extends IndustrialBaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  @Index()
  parentId: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'icon', type: 'varchar', length: 50, nullable: true })
  icon: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'article_count', type: 'int', default: 0 })
  articleCount: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}