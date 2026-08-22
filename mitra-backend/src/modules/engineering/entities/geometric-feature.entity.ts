import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum GeometricFeatureType {
  WALL_THICKNESS = 'WALL_THICKNESS',
  DRAFT_ANGLE = 'DRAFT_ANGLE',
  RIB = 'RIB',
  BOSS = 'BOSS',
  HOLE = 'HOLE',
  FILLET_RADIUS = 'FILLET_RADIUS',
  UNDERCUT = 'UNDERCUT',
  PART_BOUNDING_BOX = 'PART_BOUNDING_BOX',
}

export enum ExtractionStatus {
  VALID = 'VALID',
  PARTIAL = 'PARTIAL',
  UNSUPPORTED = 'UNSUPPORTED',
  AMBIGUOUS = 'AMBIGUOUS',
  INVALID = 'INVALID',
  QUARANTINED = 'QUARANTINED',
}

@Entity('geometric_features')
@Index(['tenantId', 'drawingId', 'drawingRevision'])
@Index(['tenantId', 'projectId'])
export class GeometricFeature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'uuid', name: 'drawing_id' })
  drawingId: string;

  @Column({ type: 'varchar', length: 50, name: 'drawing_revision', default: 'Rev A' })
  drawingRevision: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'feature_type',
  })
  featureType: GeometricFeatureType;

  @Column({ type: 'varchar', length: 100, name: 'geometry_reference', nullable: true })
  geometryReference: string | null;

  @Column({ type: 'jsonb', default: {} })
  measurements: Record<string, any>;

  @Column({ type: 'varchar', length: 20, default: 'mm' })
  unit: string;

  @Column({ type: 'varchar', length: 20, name: 'normalized_unit', default: 'mm' })
  normalizedUnit: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    name: 'conversion_factor',
    default: 1.0,
  })
  conversionFactor: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  tolerance: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  confidence: number;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'extraction_method',
    default: 'CAD_GEOMETRY_PARSER',
  })
  extractionMethod: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'extraction_status',
    default: ExtractionStatus.VALID,
  })
  extractionStatus: ExtractionStatus;

  @Column({ type: 'varchar', length: 64, name: 'source_hash', nullable: true })
  sourceHash: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
