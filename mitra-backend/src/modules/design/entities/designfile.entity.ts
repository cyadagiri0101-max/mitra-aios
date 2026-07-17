import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum DesignFileType { STEP='STEP', IGES='IGES', DXF='DXF', DWG='DWG', PDF='PDF', CAM='CAM', EDM='EDM', PHOTO='PHOTO', VIDEO='VIDEO', OTHER='OTHER' }
export enum CheckoutStatus { AVAILABLE='AVAILABLE', CHECKED_OUT='CHECKED_OUT', LOCKED='LOCKED' }

@Entity('design_files')
@Index(['partId', 'revisionId', 'deletedAt'])
export class DesignFile extends IndustrialBaseEntity {
  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @Column({ name: 'revision_id', type: 'uuid', nullable: true })
  @Index()
  revisionId: string | null;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  @Column({ name: 'file_type', type: 'enum', enum: DesignFileType, default: DesignFileType.STEP })
  fileType: DesignFileType;

  @Column({ name: 'minio_bucket', type: 'varchar', length: 100 })
  minioBucket: string;

  @Column({ name: 'minio_key', type: 'varchar', length: 500 })
  minioKey: string;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes: number | null;

  @Column({ name: 'checksum_sha256', type: 'varchar', length: 64, nullable: true })
  checksumSha256: string | null;

  @Column({ name: 'version_number', type: 'int', default: 1 })
  versionNumber: number;

  @Column({ name: 'is_latest', type: 'boolean', default: true })
  isLatest: boolean;

  @Column({ name: 'checkout_status', type: 'enum', enum: CheckoutStatus, default: CheckoutStatus.AVAILABLE })
  checkoutStatus: CheckoutStatus;

  @Column({ name: 'checked_out_by', type: 'uuid', nullable: true })
  checkedOutBy: string | null;

  @Column({ name: 'checked_out_at', type: 'timestamptz', nullable: true })
  checkedOutAt: Date | null;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}