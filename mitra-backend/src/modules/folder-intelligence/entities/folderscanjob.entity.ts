import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ScanJobStatus { PENDING='PENDING', RUNNING='RUNNING', COMPLETED='COMPLETED', FAILED='FAILED', CANCELLED='CANCELLED' }

@Entity('folder_scan_jobs')
@Index(['projectId', 'status', 'deletedAt'])
export class FolderScanJob extends IndustrialBaseEntity {
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ name: 'job_name', type: 'varchar', length: 100 })
  jobName: string;

  @Column({ name: 'root_path', type: 'varchar', length: 500 })
  rootPath: string;

  @Column({ name: 'scan_type', type: 'varchar', length: 30, default: 'CLASSIFY' })
  scanType: string;

  @Column({ type: 'enum', enum: ScanJobStatus, default: ScanJobStatus.PENDING })
  status: ScanJobStatus;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'total_files_scanned', type: 'int', default: 0 })
  totalFilesScanned: number;

  @Column({ name: 'files_classified', type: 'int', default: 0 })
  filesClassified: number;

  @Column({ name: 'files_unclassified', type: 'int', default: 0 })
  filesUnclassified: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'triggered_by', type: 'uuid', nullable: true })
  triggeredBy: string | null;
}