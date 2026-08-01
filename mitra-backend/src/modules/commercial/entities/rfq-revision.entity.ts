import { Entity, Column, VersionColumn, Index, ManyToOne, JoinColumn  } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { Rfq } from './rfq.entity';

@Entity('rfq_revisions')
@Index(['rfqId', 'revisionNumber', 'deletedAt'])
export class RfqRevision extends IndustrialBaseEntity {
  @Column({ name: 'rfq_id', type: 'uuid' })
  @Index()
  rfqId: string;

  @Column({ name: 'revision_number', type: 'int' })
  revisionNumber: number;

  @Column({ name: 'change_summary', type: 'text', nullable: true })
  changeSummary: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ name: 'revised_at', type: 'timestamptz', default: () => 'now()' })
  revisedAt: Date;

  @Column({ name: 'revised_by', type: 'uuid', nullable: true })
  revisedBy: string | null;

  @VersionColumn()
  version: number;

  @ManyToOne(() => Rfq, (rfq) => rfq.revisions)
  @JoinColumn({ name: 'rfq_id' })
  rfq: Rfq;
}
