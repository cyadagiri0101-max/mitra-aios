import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TrackingSheet } from './tracking-sheet.entity';

@Entity('tracking_sheet_revisions')
@Index('IDX_SHEET_REV_TENANT_SHEET', ['tenantId', 'trackingSheetId'])
export class TrackingSheetRevision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'tracking_sheet_id', type: 'uuid' })
  trackingSheetId: string;

  @ManyToOne(() => TrackingSheet, (sheet) => sheet.revisions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tracking_sheet_id' })
  trackingSheet: TrackingSheet;

  @Column({ name: 'revision_code', type: 'varchar', length: 50 })
  revisionCode: string;

  @Column({ name: 'source_hash', type: 'varchar', length: 100 })
  sourceHash: string;

  @Column({ name: 'change_summary', type: 'text', nullable: true })
  changeSummary: string;

  @Column({ name: 'total_rows', type: 'int', default: 0 })
  totalRows: number;

  @Column({ name: 'imported_by', type: 'varchar', length: 100, nullable: true })
  importedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
