import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../../project/entities/project.entity';
import { G14FeatureVector, G14FeatureMetadata, G14PredictionTarget } from '../dto/g14-feature.dto';

@Entity('g14_feature_snapshots')
@Index(['tenantId', 'projectId', 'predictionCutoff', 'featureVersion'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
export class G14FeatureSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ type: 'uuid', name: 'project_id' })
  @Index()
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'timestamptz', name: 'prediction_cutoff' })
  @Index()
  predictionCutoff: Date;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'feature_version',
    default: 'G14_FEATURES_V1',
  })
  featureVersion: string;

  @Column({ type: 'jsonb', name: 'feature_vector' })
  featureVector: G14FeatureVector;

  @Column({ type: 'jsonb', name: 'feature_metadata' })
  featureMetadata: G14FeatureMetadata;

  @Column({ type: 'jsonb', name: 'ground_truth_target', nullable: true })
  groundTruthTarget: G14PredictionTarget | null;

  @Column({ type: 'varchar', length: 64, name: 'source_records_hash' })
  sourceRecordsHash: string;

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
