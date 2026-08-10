import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum DrawingRevisionStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RELEASED = 'RELEASED',
  SUPERSEDED = 'SUPERSEDED',
  OBSOLETE = 'OBSOLETE',
}

/**
 * Versioned revision of an Engineering Drawing. Each check-in creates a new
 * revision/version row; the drawing's `current_revision` points at the
 * newest row. Comparison across revisions is supported.
 */
@Entity('engineering_drawing_revisions')
@Index(['drawingId', 'deletedAt'])
export class EngineeringDrawingRevision extends IndustrialBaseEntity {
  @Column({ name: 'drawing_id', type: 'uuid' })
  @Index()
  drawingId: string;

  /** Alpha revision letter (A, B, C…) */
  @Column({ type: 'varchar', length: 10 })
  revision: string;

  /** Numeric version within the revision (1, 2, 3…) */
  @Column({ name: 'version_number', type: 'int', default: 1 })
  versionNumber: number;

  @Column({ name: 'file_name', type: 'varchar', length: 300, nullable: true })
  fileName: string | null;

  @Column({ name: 'file_path', type: 'varchar', length: 500, nullable: true })
  filePath: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: 'file_size', type: 'bigint', default: 0 })
  fileSize: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum: string | null;

  @Column({ type: 'varchar', length: 30, default: DrawingRevisionStatus.DRAFT })
  status: DrawingRevisionStatus;

  @Column({ name: 'change_summary', type: 'text', nullable: true })
  changeSummary: string | null;

  @Column({ name: 'checked_in_by', type: 'uuid', nullable: true })
  checkedInBy: string | null;

  @Column({ name: 'checked_in_by_name', type: 'varchar', length: 200, nullable: true })
  checkedInByName: string | null;

  @Column({ name: 'checked_in_at', type: 'timestamptz', nullable: true })
  checkedInAt: Date | null;

  @Column({ name: 'released_by', type: 'uuid', nullable: true })
  releasedBy: string | null;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt: Date | null;
}
