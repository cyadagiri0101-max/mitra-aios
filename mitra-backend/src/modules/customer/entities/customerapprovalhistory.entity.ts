import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('customer_approval_history')
@Index(['approvalId', 'createdAt'])
export class CustomerApprovalHistory extends IndustrialBaseEntity {
  @Column({ name: 'approval_id', type: 'uuid' })
  approvalId: string;

  @Column({ name: 'action', type: 'varchar', length: 50 })
  action: string;

  @Column({ name: 'from_status', type: 'varchar', length: 30, nullable: true })
  fromStatus: string | null;

  @Column({ name: 'to_status', type: 'varchar', length: 30, nullable: true })
  toStatus: string | null;

  @Column({ name: 'performed_by', type: 'uuid', nullable: true })
  performedBy: string | null;

  @Column({ name: 'performed_by_name', type: 'varchar', length: 100, nullable: true })
  performedByName: string | null;

  @Column({ name: 'performed_at', type: 'timestamptz' })
  performedAt: Date;

  @Column({ type: 'text', nullable: true })
  comments: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}