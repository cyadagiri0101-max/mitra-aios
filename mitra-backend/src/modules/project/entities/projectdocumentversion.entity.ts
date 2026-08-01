import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { ProjectDocument } from './projectdocument.entity';

/**
 * A physical file revision of a project document.
 * Uploading a new revision increments `versionNumber` and marks the
 * previous version as superseded via `ProjectDocument.currentVersion`.
 */
@Entity('project_document_versions')
@Index(['documentId', 'deletedAt'])
export class ProjectDocumentVersion extends IndustrialBaseEntity {
  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ManyToOne(() => ProjectDocument, (d) => d.versions)
  @JoinColumn({ name: 'document_id' })
  document: ProjectDocument;

  @Column({ name: 'version_number', type: 'int' })
  versionNumber: number;

  @Column({ name: 'file_name', type: 'varchar', length: 300 })
  fileName: string;

  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  filePath: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: 'file_size', type: 'int', default: 0 })
  fileSize: number;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum: string | null;
}
