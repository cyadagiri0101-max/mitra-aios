import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { MilestoneTemplate } from './milestone-template.entity';

/**
 * A single milestone definition inside a milestone template.
 * `plannedDaysOffset` is the number of days after the project start date.
 */
@Entity('milestone_template_items')
@Index(['templateId', 'sequenceNumber'])
export class MilestoneTemplateItem extends IndustrialBaseEntity {
  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @ManyToOne(() => MilestoneTemplate, (t) => t.items)
  @JoinColumn({ name: 'template_id' })
  template: MilestoneTemplate;

  @Column({ name: 'milestone_name', type: 'varchar', length: 200 })
  milestoneName: string;

  @Column({ name: 'milestone_stage', type: 'varchar', length: 50 })
  milestoneStage: string;

  @Column({ name: 'sequence_number', type: 'int', default: 1 })
  sequenceNumber: number;

  /** Days after project start when this milestone is planned. */
  @Column({ name: 'planned_days_offset', type: 'int', default: 0 })
  plannedDaysOffset: number;

  /** Sequence number this milestone depends on (or null for the first). */
  @Column({ name: 'depends_on_sequence', type: 'int', nullable: true })
  dependsOnSequence: number | null;

  @Column({ name: 'is_critical_path', type: 'boolean', default: false })
  isCriticalPath: boolean;

  @Column({ name: 'default_owner_role', type: 'varchar', length: 50, nullable: true })
  defaultOwnerRole: string | null;

  @Column({ name: 'requires_approval', type: 'boolean', default: false })
  requiresApproval: boolean;
}
