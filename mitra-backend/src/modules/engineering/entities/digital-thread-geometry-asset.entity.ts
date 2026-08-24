import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type GeometryCadFormat = 'GLB' | 'GLTF' | 'STEP' | 'STP' | 'IGES' | 'IGS' | 'PDF' | 'DXF' | 'DWG' | 'UNSUPPORTED';
export type DecisionOverlayColor = 'RED' | 'ORANGE' | 'YELLOW' | 'BLUE' | 'PURPLE' | 'GREEN' | 'NONE';

@Entity('digital_thread_geometry_assets')
@Index(['tenantId', 'projectId'])
@Index(['tenantId', 'componentId'])
@Index(['tenantId', 'sourceFileHash'])
export class DigitalThreadGeometryAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'project_id', type: 'varchar', length: 100 })
  projectId: string;

  @Column({ name: 'component_id', type: 'varchar', length: 100 })
  componentId: string;

  @Column({ name: 'component_code', type: 'varchar', length: 100 })
  componentCode: string;

  @Column({ name: 'component_name', type: 'varchar', length: 255 })
  componentName: string;

  @Column({ name: 'revision_code', type: 'varchar', length: 50, default: 'Rev 0' })
  revisionCode: string;

  @Column({ name: 'deliverable_id', type: 'varchar', length: 100, nullable: true })
  deliverableId: string | null;

  @Column({ name: 'source_file_name', type: 'varchar', length: 255 })
  sourceFileName: string;

  @Column({ name: 'source_file_path', type: 'varchar', length: 500 })
  sourceFilePath: string;

  @Column({ name: 'source_file_hash', type: 'varchar', length: 64 })
  sourceFileHash: string;

  @Column({ name: 'cad_format', type: 'varchar', length: 50, default: 'STEP' })
  cadFormat: GeometryCadFormat;

  @Column({ name: 'mesh_url', type: 'varchar', length: 500, nullable: true })
  meshUrl: string | null;

  @Column({ name: 'mesh_hash', type: 'varchar', length: 64, nullable: true })
  meshHash: string | null;

  @Column({ name: 'bounding_box', type: 'jsonb', nullable: true })
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
    center: [number, number, number];
    dimensions: [number, number, number];
  } | null;

  @Column({ name: 'color_overlay', type: 'varchar', length: 50, default: 'GREEN' })
  colorOverlay: DecisionOverlayColor;

  @Column({ name: 'overlay_reason', type: 'text', nullable: true })
  overlayReason: string | null;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'IN_PROGRESS' })
  status: string;

  @Column({ name: 'responsible_engineer_id', type: 'varchar', length: 100, default: 'UNASSIGNED' })
  responsibleEngineerId: string;

  @Column({ name: 'is_ambiguous', type: 'boolean', default: false })
  isAmbiguous: boolean;

  @Column({ name: 'binding_confidence', type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  bindingConfidence: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
