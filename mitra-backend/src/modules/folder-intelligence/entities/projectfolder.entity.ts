import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('project_folders')
@Index(['projectId', 'deletedAt'])
export class ProjectFolder extends IndustrialBaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'folder_path', type: 'varchar', length: 500 })
  folderPath: string;

  @Column({ name: 'folder_name', type: 'varchar', length: 255 })
  folderName: string;

  @Column({ name: 'folder_type', type: 'varchar', length: 50 })
  folderType: string;

  @Column({ name: 'minio_prefix', type: 'varchar', length: 500, nullable: true })
  minioPrefix: string | null;

  @Column({ name: 'file_count', type: 'int', default: 0 })
  fileCount: number;

  @Column({ name: 'total_size_bytes', type: 'bigint', default: 0 })
  totalSizeBytes: number;

  @Column({ name: 'last_scanned_at', type: 'timestamptz', nullable: true })
  lastScannedAt: Date | null;

  @Column({ name: 'is_watched', type: 'boolean', default: false })
  isWatched: boolean;
}