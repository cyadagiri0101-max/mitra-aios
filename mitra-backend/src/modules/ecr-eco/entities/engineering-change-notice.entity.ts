import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ECNStatus {
  ISSUED = 'ISSUED',
  IMPLEMENTED = 'IMPLEMENTED',
  VERIFIED = 'VERIFIED',
  CLOSED = 'CLOSED',
}

/**
 * Engineering Change Notice (ECN) — Sprint 2.3. Notifies downstream
 * consumers (manufacturing, quality, purchasing) that an approved change
 * is effective. Derives from an ECO and always belongs to a project.
 */
@Entity('engineering_change_notices')
@Index(['ecnNumber', 'deletedAt'])
@Index(['ecoId', 'deletedAt'])
@Index(['projectId', 'deletedAt'])
export class EngineeringChangeNotice extends IndustrialBaseEntity {
  @Column({ name: 'ecn_number', type: 'varchar', length: 30, unique: true })
  ecnNumber: string;

  @Column({ name: 'eco_id', type: 'uuid' })
  @Index()
  ecoId: string;

  @Column({ name: 'ecr_id', type: 'uuid', nullable: true })
  ecrId: string | null;

  /** Every engineering artifact belongs to a Project — enforced at entity level. */
  @Column({ name: 'project_id', type: 'uuid' })
  @Index()
  projectId: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 30, default: ECNStatus.ISSUED })
  status: ECNStatus;

  @Column({ name: 'issued_by', type: 'uuid', nullable: true })
  issuedBy: string | null;

  @Column({ name: 'issued_at', type: 'timestamptz', nullable: true })
  issuedAt: Date | null;

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: Date | null;

  /** Downstream recipients: [ { userId, role, name } ]. */
  @Column({ name: 'notified_to', type: 'jsonb', nullable: true })
  notifiedTo: Record<string, any>[] | null;

  /** Affected manufacturing orders: [ { workOrderId, woNumber, action } ]. */
  @Column({ name: 'affected_manufacturing_orders', type: 'jsonb', nullable: true })
  affectedManufacturingOrders: Record<string, any>[] | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
