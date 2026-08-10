import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

/**
 * Immutable version of an Engineering Document. Every upload appends a new
 * version — nothing is ever overwritten (version every document).
 */
@Entity('engineering_document_versions')
@Index(['documentId', 'deletedAt'])
export class EngineeringDocumentVersion extends IndustrialBaseEntity {
  @Column({ name: 'document_id', type: 'uuid' })
  @Index()
  documentId: string;

  @Column({ name: 'version_number', type: 'int' })
  versionNumber: number;

  @Column({ name: 'file_name', type: 'varchar', length: 300 })
  fileName: string;

  @Column({ name: 'file_path', type: 'varchar', length: 500, nullable: true })
  filePath: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: 'file_size', type: 'bigint', default: 0 })
  fileSize: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum: string | null;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy: string | null;

  @Column({ name: 'uploaded_by_name', type: 'varchar', length: 200, nullable: true })
  uploadedByName: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
