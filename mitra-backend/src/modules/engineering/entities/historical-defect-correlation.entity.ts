import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DefectTaxonomyType {
  SHORT_SHOT = 'SHORT_SHOT',
  FLASH = 'FLASH',
  SINK_MARK = 'SINK_MARK',
  WARPAGE = 'WARPAGE',
  BURNT_MARK = 'BURNT_MARK',
  EJECTION_MARK = 'EJECTION_MARK',
  CORE_PIN_DEFLECTION = 'CORE_PIN_DEFLECTION',
  TOOL_BREAKAGE = 'TOOL_BREAKAGE',
  DIMENSIONAL_VARIATION = 'DIMENSIONAL_VARIATION',
  COOLING_VARIANCE = 'COOLING_VARIANCE',
  CYCLE_TIME_VARIANCE = 'CYCLE_TIME_VARIANCE',
  SURFACE_DEFECT = 'SURFACE_DEFECT',
  CRACK = 'CRACK',
  THIN_WALL_FAILURE = 'THIN_WALL_FAILURE',
  OTHER = 'OTHER',
}

export enum CorrelationStrength {
  NO_EVIDENCE = 'NO_EVIDENCE',
  WEAK_ASSOCIATION = 'WEAK_ASSOCIATION',
  MODERATE_ASSOCIATION = 'MODERATE_ASSOCIATION',
  STRONG_ASSOCIATION = 'STRONG_ASSOCIATION',
  CONFIRMED_ENGINEERING_RELATIONSHIP = 'CONFIRMED_ENGINEERING_RELATIONSHIP',
  UNCONFIRMED = 'UNCONFIRMED',
}

@Entity('historical_defect_correlations')
@Index(['tenantId', 'findingId'])
@Index(['tenantId', 'drawingId', 'drawingRevision'])
@Index(['tenantId', 'defectType'])
export class HistoricalDefectCorrelation {
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

  @Column({ type: 'uuid', name: 'feature_id', nullable: true })
  featureId: string | null;

  @Column({ type: 'uuid', name: 'finding_id', nullable: true })
  findingId: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'defect_type',
  })
  defectType: DefectTaxonomyType;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'correlation_strength',
    default: CorrelationStrength.MODERATE_ASSOCIATION,
  })
  correlationStrength: CorrelationStrength;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    name: 'confidence_score',
    default: 0.85,
  })
  confidenceScore: number;

  @Column({ type: 'int', name: 'historical_evidence_count', default: 0 })
  historicalEvidenceCount: number;

  @Column({ type: 'int', name: 'related_defect_count', default: 0 })
  relatedDefectCount: number;

  @Column({ type: 'varchar', length: 50, name: 'matched_material', default: 'ABS' })
  matchedMaterial: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'matched_process',
    default: 'INJECTION_MOLDING',
  })
  matchedProcess: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    name: 'similarity_score',
    default: 0.9,
  })
  similarityScore: number;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'correlation_version',
    default: '1.0',
  })
  correlationVersion: string;

  @Column({ type: 'jsonb', name: 'evidence_references', default: [] })
  evidenceReferences: Record<string, any>[];

  @Column({ type: 'jsonb', name: 'provenance_context', default: {} })
  provenanceContext: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
