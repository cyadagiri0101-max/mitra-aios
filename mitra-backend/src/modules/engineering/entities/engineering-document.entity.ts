import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum EngineeringDocType {
  CAD = 'CAD',
  PDF = 'PDF',
  SPECIFICATION = 'SPECIFICATION',
  STANDARD = 'STANDARD',
  CALCULATION = 'CALCULATION',
  IMAGE = 'IMAGE',
  SIMULATION_RESULT = 'SIMULATION_RESULT',
  OTHER = 'OTHER',
}

/**
 * Engineering Document — versioned container for CAD files, PDFs,
 * specifications, standards, calculations, images and simulation results.
 * Every version is preserved in engineering_document_versions.
 */
@Entity('engineering_documents')
@Index(['documentNumber', 'deletedAt'])
@Index(['projectId', 'deletedAt'])
export class EngineeringDocument extends IndustrialBaseEntity {
  @Column({ name: 'document_number', type: 'varchar', length: 30 })
  @Index()
  documentNumber: string;

  /** Every engineering artifact belongs to a Project — enforced at entity level. */
  @Column({ name: 'project_id', type: 'uuid' })
  @Index()
  projectId: string;

  @Column({ name: 'doc_type', type: 'varchar', length: 30, default: EngineeringDocType.PDF })
  docType: EngineeringDocType;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'file_name', type: 'varchar', length: 300, nullable: true })
  fileName: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: 'file_size', type: 'bigint', default: 0 })
  fileSize: number;

  @Column({ name: 'current_version', type: 'int', default: 1 })
  currentVersion: number;

  @Column({ type: 'varchar', length: 30, default: 'DRAFT' })
  status: string;

  @Column({ name: 'drawing_id', type: 'uuid', nullable: true })
  drawingId: string | null;

  @Column({ name: 'bom_id', type: 'uuid', nullable: true })
  bomId: string | null;

  @Column({ name: 'released_by', type: 'uuid', nullable: true })
  releasedBy: string | null;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
