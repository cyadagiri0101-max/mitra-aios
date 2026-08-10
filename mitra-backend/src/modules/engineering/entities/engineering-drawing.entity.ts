import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum DrawingType {
  PART = 'PART',
  ASSEMBLY = 'ASSEMBLY',
  MOLD_BASE = 'MOLD_BASE',
  CAVITY = 'CAVITY',
  CORE = 'CORE',
  FIXTURE = 'FIXTURE',
  ELECTRODE = 'ELECTRODE',
  LAYOUT = 'LAYOUT',
  STANDARD = 'STANDARD',
  OTHER = 'OTHER',
}

export enum CadFileType {
  SOLIDWORKS = 'SOLIDWORKS',
  NX = 'NX',
  CATIA = 'CATIA',
  CREO = 'CREO',
  INVENTOR = 'INVENTOR',
  STEP = 'STEP',
  IGES = 'IGES',
  STL = 'STL',
  DXF = 'DXF',
  DWG = 'DWG',
  PDF = 'PDF',
  OTHER = 'OTHER',
}

/**
 * Engineering Drawing master — the authoritative drawing record for the
 * Engineering Domain. Every drawing belongs to a project (no orphans) and
 * carries a DB-driven workflow (engineering_drawing), revision history,
 * check-in/check-out control and CAD metadata for AI-ready enrichment.
 */
@Entity('engineering_drawings')
@Index(['drawingNumber', 'deletedAt'])
@Index(['projectId', 'deletedAt'])
@Index(['projectId', 'status', 'deletedAt'])
export class EngineeringDrawing extends IndustrialBaseEntity {
  @Column({ name: 'drawing_number', type: 'varchar', length: 30 })
  @Index()
  drawingNumber: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ name: 'drawing_type', type: 'varchar', length: 30, default: DrawingType.PART })
  drawingType: DrawingType;

  /** Every engineering artifact belongs to a Project — enforced at entity level. */
  @Column({ name: 'project_id', type: 'uuid' })
  @Index()
  projectId: string;

  /** Linked BOM (optional until BOM is created for the drawing). */
  @Column({ name: 'bom_id', type: 'uuid', nullable: true })
  @Index()
  bomId: string | null;

  /** Legacy design_parts integration point. */
  @Column({ name: 'part_id', type: 'uuid', nullable: true })
  partId: string | null;

  @Column({ name: 'part_number', type: 'varchar', length: 50, nullable: true })
  partNumber: string | null;

  @Column({ name: 'current_revision', type: 'varchar', length: 10, default: 'A' })
  currentRevision: string;

  /** Workflow-driven status — mirrors the engineering_drawing workflow state. */
  @Column({ type: 'varchar', length: 50, default: 'DRAFT' })
  status: string;

  @Column({ name: 'workflow_instance_id', type: 'uuid', nullable: true })
  workflowInstanceId: string | null;

  // ── Check-in / Check-out ─────────────────────────────────────────────────

  @Column({ name: 'checked_out_by', type: 'uuid', nullable: true })
  checkedOutBy: string | null;

  @Column({ name: 'checked_out_by_name', type: 'varchar', length: 200, nullable: true })
  checkedOutByName: string | null;

  @Column({ name: 'checked_out_at', type: 'timestamptz', nullable: true })
  checkedOutAt: Date | null;

  // ── CAD metadata ─────────────────────────────────────────────────────────

  @Column({ name: 'cad_file_type', type: 'varchar', length: 30, nullable: true })
  cadFileType: CadFileType | null;

  @Column({ name: 'cad_app_name', type: 'varchar', length: 100, nullable: true })
  cadAppName: string | null;

  @Column({ name: 'cad_app_version', type: 'varchar', length: 50, nullable: true })
  cadAppVersion: string | null;

  @Column({ name: 'file_size_bytes', type: 'bigint', default: 0 })
  fileSizeBytes: number;

  @Column({ name: 'last_file_checksum', type: 'varchar', length: 64, nullable: true })
  lastFileChecksum: string | null;

  @Column({ name: 'length_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  lengthMm: number | null;

  @Column({ name: 'width_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  widthMm: number | null;

  @Column({ name: 'height_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  heightMm: number | null;

  @Column({ name: 'drawing_scale', type: 'varchar', length: 20, nullable: true })
  drawingScale: string | null;

  @Column({ name: 'sheet_number', type: 'varchar', length: 20, nullable: true })
  sheetNumber: string | null;

  @Column({ name: 'sheet_size', type: 'varchar', length: 20, nullable: true })
  sheetSize: string | null;

  @Column({ name: 'weight_kg', type: 'decimal', precision: 12, scale: 4, nullable: true })
  weightKg: number | null;

  // ── Approval ─────────────────────────────────────────────────────────────

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'released_by', type: 'uuid', nullable: true })
  releasedBy: string | null;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt: Date | null;

  @Column({ name: 'revision_notes', type: 'text', nullable: true })
  revisionNotes: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', array: true, nullable: true })
  tags: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
