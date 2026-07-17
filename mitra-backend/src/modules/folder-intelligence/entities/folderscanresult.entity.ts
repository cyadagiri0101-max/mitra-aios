import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('folder_scan_results')
@Index(['scanJobId', 'deletedAt'])
@Index(['detectedFileType', 'deletedAt'])
export class FolderScanResult extends IndustrialBaseEntity {
  @Column({ name: 'scan_job_id', type: 'uuid' })
  scanJobId: string;

  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  filePath: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'file_extension', type: 'varchar', length: 20, nullable: true })
  fileExtension: string | null;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes: number | null;

  @Column({ name: 'file_modified_at', type: 'timestamptz', nullable: true })
  fileModifiedAt: Date | null;

  @Column({ name: 'detected_file_type', type: 'varchar', length: 50, nullable: true })
  detectedFileType: string | null;

  @Column({ name: 'detection_method', type: 'varchar', length: 30, nullable: true })
  detectionMethod: string | null;

  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidenceScore: number | null;

  @Column({ name: 'matched_rule_id', type: 'uuid', nullable: true })
  @Index()
  matchedRuleId: string | null;

  @Column({ name: 'is_classified', type: 'boolean', default: false })
  isClassified: boolean;

  @Column({ name: 'needs_review', type: 'boolean', default: false })
  needsReview: boolean;

  @Column({ name: 'minio_imported', type: 'boolean', default: false })
  minioImported: boolean;
}