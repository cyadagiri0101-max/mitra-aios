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
import { MachineMaster } from '../../machine/entities/machinemaster.entity';
import {
  G14CapacityFeatureVector,
  G14CapacityFeatureMetadata,
  G14CapacityPredictionTarget,
} from '../dto/g14-capacity.dto';

@Entity('g14_capacity_snapshots')
@Index(['tenantId', 'machineId', 'predictionCutoff', 'featureVersion'], {
  where: 'deleted_at IS NULL',
})
export class G14CapacitySnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ type: 'uuid', name: 'machine_id' })
  @Index()
  machineId: string;

  @ManyToOne(() => MachineMaster, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: MachineMaster;

  @Column({ type: 'timestamptz', name: 'prediction_cutoff' })
  @Index()
  predictionCutoff: Date;

  @Column({ type: 'int', name: 'forecast_horizon_days', default: 30 })
  forecastHorizonDays: number;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'feature_version',
    default: 'G14_CAPACITY_V1',
  })
  featureVersion: string;

  @Column({ type: 'jsonb', name: 'feature_vector' })
  featureVector: G14CapacityFeatureVector;

  @Column({ type: 'jsonb', name: 'feature_metadata' })
  featureMetadata: G14CapacityFeatureMetadata;

  @Column({ type: 'jsonb', name: 'ground_truth_target', nullable: true })
  groundTruthTarget: G14CapacityPredictionTarget | null;

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
