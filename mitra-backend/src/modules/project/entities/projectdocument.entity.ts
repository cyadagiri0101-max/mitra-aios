import { Entity, Column, Index, OneToMany } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { ProjectDocumentVersion } from './projectdocumentversion.entity';

export enum ProjectDocumentType {
  DRAWING = 'DRAWING',
  RFQ = 'RFQ',
  QUOTATION = 'QUOTATION',
  MEETING_NOTE = 'MEETING_NOTE',
  CONTRACT = 'CONTRACT',
  IMAGE = 'IMAGE',
  TRIAL_REPORT = 'TRIAL_REPORT',
  OTHER = 'OTHER',
}

export enum ProjectDocumentStatus {
  DRAFT = 'DRAFT',
  RELEASED = 'RELEASED',
  SUPERSEDED = 'SUPERSEDED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * A versioned project document. The physical file is stored in
 * `project_document_versions`; the document row tracks the current version.
 */
@Entity('project_documents')
@Index(['projectId', 'deletedAt'])
@Index(['folderId', 'deletedAt'])
export class ProjectDocument extends IndustrialBaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'folder_id', type: 'uuid', nullable: true })
  folderId: string | null;

  @Column({ name: 'document_type', type: 'varchar', length: 30, default: ProjectDocumentType.OTHER })
  documentType: ProjectDocumentType;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'file_name', type: 'varchar', length: 300 })
  fileName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: 'file_size', type: 'int', default: 0 })
  fileSize: number;

  @Column({ name: 'current_version', type: 'int', default: 1 })
  currentVersion: number;

  @Column({ type: 'varchar', length: 20, default: ProjectDocumentStatus.DRAFT })
  status: ProjectDocumentStatus;

  @Column({ name: 'is_latest', type: 'boolean', default: true })
  isLatest: boolean;

  @Column({ name: 'released_by', type: 'uuid', nullable: true })
  releasedBy: string | null;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt: Date | null;

  @OneToMany(() => ProjectDocumentVersion, (v) => v.document)
  versions: ProjectDocumentVersion[];
}
