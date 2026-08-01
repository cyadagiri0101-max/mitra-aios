import { Entity, Column, Index, OneToMany } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { MilestoneTemplateItem } from './milestone-template-item.entity';

/**
 * Configurable milestone template — a reusable sequence of milestone
 * definitions that is cloned into a project on creation.
 */
@Entity('milestone_templates')
@Index(['code', 'tenantId', 'deletedAt'])
export class MilestoneTemplate extends IndustrialBaseEntity {
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @OneToMany(() => MilestoneTemplateItem, (item) => item.template)
  items: MilestoneTemplateItem[];
}
