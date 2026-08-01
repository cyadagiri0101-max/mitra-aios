import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum RiskStatus {
  OPEN = 'OPEN',
  MITIGATING = 'MITIGATING',
  CLOSED = 'CLOSED',
}

export enum RiskCategory {
  SCHEDULE = 'SCHEDULE',
  COST = 'COST',
  QUALITY = 'QUALITY',
  TECHNICAL = 'TECHNICAL',
  RESOURCE = 'RESOURCE',
  SUPPLY = 'SUPPLY',
  COMPLIANCE = 'COMPLIANCE',
  OTHER = 'OTHER',
}

/**
 * Risk register entry. `exposure` = impact × probability (1–25).
 */
@Entity('project_risks')
@Index(['projectId', 'deletedAt'])
@Index(['status', 'deletedAt'])
export class ProjectRisk extends IndustrialBaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50, default: RiskCategory.OTHER })
  category: RiskCategory;

  /** 1–5 */
  @Column({ type: 'int', default: 1 })
  impact: number;

  /** 1–5 */
  @Column({ type: 'int', default: 1 })
  probability: number;

  /** Computed: impact × probability (1–25). */
  @Column({ type: 'int', default: 1 })
  exposure: number;

  @Column({ type: 'text', nullable: true })
  mitigation: string | null;

  @Column({ type: 'text', nullable: true })
  contingency: string | null;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  @Index()
  ownerId: string | null;

  @Column({ name: 'owner_name', type: 'varchar', length: 200, nullable: true })
  ownerName: string | null;

  @Column({ name: 'review_date', type: 'date', nullable: true })
  reviewDate: Date | null;

  @Column({ type: 'varchar', length: 20, default: RiskStatus.OPEN })
  status: RiskStatus;

  @Column({ name: 'raised_by', type: 'uuid', nullable: true })
  raisedBy: string | null;

  @Column({ name: 'raised_by_name', type: 'varchar', length: 200, nullable: true })
  raisedByName: string | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;
}
