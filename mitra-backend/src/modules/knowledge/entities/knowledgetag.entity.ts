import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('knowledge_tags')
@Index(['slug', 'deletedAt'])
export class KnowledgeTag extends IndustrialBaseEntity {
  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string | null;

  @Column({ name: 'usage_count', type: 'int', default: 0 })
  usageCount: number;
}