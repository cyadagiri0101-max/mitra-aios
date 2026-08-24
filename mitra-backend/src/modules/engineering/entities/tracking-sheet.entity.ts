import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { TrackingSheetRevision } from './tracking-sheet-revision.entity';
import { TrackingSheetRow } from './tracking-sheet-row.entity';

@Entity('tracking_sheets')
@Index('IDX_TRACKING_SHEET_TENANT_PROJ', ['tenantId', 'projectId'])
export class TrackingSheet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'project_id', type: 'varchar', length: 100 })
  projectId: string;

  @Column({ name: 'sheet_title', type: 'varchar', length: 255 })
  sheetTitle: string;

  @Column({ name: 'sheet_type', type: 'varchar', length: 100, default: 'PROCESS_PLANNING' })
  sheetType: 'PROCESS_PLANNING' | 'WORKLOAD_TRACKING' | 'PROJECT_CHECKLIST' | 'DELIVERABLE_REGISTER';

  @Column({ name: 'source_file_name', type: 'varchar', length: 255 })
  sourceFileName: string;

  @Column({ name: 'source_file_hash', type: 'varchar', length: 100 })
  sourceFileHash: string;

  @Column({ name: 'active_revision', type: 'varchar', length: 50, default: 'Rev 0' })
  activeRevision: string;

  @Column({ name: 'total_rows_count', type: 'int', default: 0 })
  totalRowsCount: number;

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  status: 'ACTIVE' | 'ARCHIVED' | 'SUPERSEDED';

  @Column({ name: 'uploaded_by', type: 'varchar', length: 100, nullable: true })
  uploadedBy: string;

  @OneToMany(() => TrackingSheetRevision, (rev) => rev.trackingSheet, { cascade: true })
  revisions: TrackingSheetRevision[];

  @OneToMany(() => TrackingSheetRow, (row) => row.trackingSheet, { cascade: true })
  rows: TrackingSheetRow[];

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
