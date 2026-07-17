import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum DocumentStatus { DRAFT='DRAFT', UNDER_REVIEW='UNDER_REVIEW', APPROVED='APPROVED', RELEASED='RELEASED', OBSOLETE='OBSOLETE', ARCHIVED='ARCHIVED' }
export enum DocumentCategory { DESIGN='DESIGN', MANUFACTURING='MANUFACTURING', QUALITY='QUALITY', COMMERCIAL='COMMERCIAL', GENERAL='GENERAL' }

@Entity('document_versions')
@Index(['documentNumber', 'versionNumber', 'deletedAt'])
@Index(['entityType', 'entityId', 'deletedAt'])
export class DocumentVersion extends IndustrialBaseEntity {
  @Column({ name: 'document_number', type: 'varchar', length: 50 })
  documentNumber: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ name: 'version_number', type: 'varchar', length: 10, default: '1.0' })
  versionNumber: string;

  @Column({ name: 'version_int', type: 'int', default: 1 })
  versionInt: number;

  @Column({ name: 'entity_type', type: 'varchar', length: 50, nullable: true })
  entityType: string | null;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  @Index()
  entityId: string | null;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  @Column({ name: 'file_extension', type: 'varchar', length: 20, nullable: true })
  fileExtension: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes: number | null;

  @Column({ name: 'minio_bucket', type: 'varchar', length: 100 })
  minioBucket: string;

  @Column({ name: 'minio_key', type: 'varchar', length: 500 })
  minioKey: string;

  @Column({ name: 'checksum_sha256', type: 'varchar', length: 64, nullable: true })
  checksumSha256: string | null;

  @Column({ type: 'enum', enum: DocumentCategory, default: DocumentCategory.GENERAL })
  category: DocumentCategory;

  @Column({ name: 'is_latest', type: 'boolean', default: true })
  isLatest: boolean;

  @Column({ type: 'enum', enum: DocumentStatus, default: DocumentStatus.DRAFT })
  status: DocumentStatus;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date | null;

  @Column({ name: 'change_summary', type: 'text', nullable: true })
  changeSummary: string | null;

  @Column({ name: 'access_roles', type: 'jsonb', nullable: true })
  accessRoles: string[] | null;

  @Column({ name: 'tags', type: 'jsonb', nullable: true })
  tags: string[] | null;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy: string | null;
}