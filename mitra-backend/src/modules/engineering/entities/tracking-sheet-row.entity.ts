import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TrackingSheet } from './tracking-sheet.entity';

@Entity('tracking_sheet_rows')
@Index('IDX_SHEET_ROW_TENANT_SHEET_NUM', ['tenantId', 'trackingSheetId', 'rowNumber'])
export class TrackingSheetRow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'tracking_sheet_id', type: 'uuid' })
  trackingSheetId: string;

  @ManyToOne(() => TrackingSheet, (sheet) => sheet.rows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tracking_sheet_id' })
  trackingSheet: TrackingSheet;

  @Column({ name: 'sheet_tab_name', type: 'varchar', length: 100, default: 'Sheet1' })
  sheetTabName: string;

  @Column({ name: 'row_number', type: 'int' })
  rowNumber: number;

  @Column({ name: 'component_code', type: 'varchar', length: 100, nullable: true })
  componentCode: string;

  @Column({ name: 'component_name', type: 'varchar', length: 255, nullable: true })
  componentName: string;

  @Column({ name: 'raw_deliverable_text', type: 'varchar', length: 255, nullable: true })
  rawDeliverableText: string;

  @Column({ name: 'normalized_deliverable_type', type: 'varchar', length: 100, nullable: true })
  normalizedDeliverableType: string;

  @Column({ name: 'recorded_status', type: 'varchar', length: 50, default: 'PENDING' })
  recordedStatus: 'NOT_STARTED' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

  @Column({ name: 'assigned_engineer', type: 'varchar', length: 100, nullable: true })
  assignedEngineer: string;

  @Column({ name: 'planned_date', type: 'varchar', length: 50, nullable: true })
  plannedDate: string;

  @Column({ name: 'actual_date', type: 'varchar', length: 50, nullable: true })
  actualDate: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ name: 'cell_provenance', type: 'jsonb', default: {} })
  cellProvenance: Record<string, any>;

  @Column({ name: 'raw_row_data', type: 'jsonb', default: {} })
  rawRowData: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
