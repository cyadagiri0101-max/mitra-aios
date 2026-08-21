import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { G14ModelEvaluationMetrics } from '../dto/g14-prediction.dto';

@Entity('g14_model_artifacts')
@Index(['tenantId', 'modelVersion'])
@Index(['tenantId', 'isActive'], { where: 'deleted_at IS NULL' })
export class G14ModelArtifact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ type: 'varchar', length: 50, name: 'model_version' })
  modelVersion: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'feature_version',
    default: 'G14_FEATURES_V1',
  })
  featureVersion: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'model_type',
    default: 'RIDGE_CALIBRATED_REGRESSION',
  })
  modelType: string;

  @Column({ type: 'jsonb' })
  weights: number[];

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 4,
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => Number(v),
    },
  })
  intercept: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 4,
    name: 'residual_std_dev',
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => Number(v),
    },
  })
  residualStdDev: number;

  @Column({ type: 'jsonb', name: 'evaluation_metrics' })
  evaluationMetrics: G14ModelEvaluationMetrics;

  @Column({ type: 'int', name: 'sample_count', default: 0 })
  sampleCount: number;

  @Column({
    type: 'timestamptz',
    name: 'training_window_start',
    nullable: true,
  })
  trainingWindowStart: Date | null;

  @Column({
    type: 'timestamptz',
    name: 'training_window_end',
    nullable: true,
  })
  trainingWindowEnd: Date | null;

  @Column({ type: 'varchar', length: 64, name: 'provenance_hash' })
  provenanceHash: string;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'varchar', length: 100, name: 'created_by', nullable: true })
  createdBy: string | null;

  @Column({ type: 'varchar', length: 100, name: 'updated_by', nullable: true })
  updatedBy: string | null;
}
