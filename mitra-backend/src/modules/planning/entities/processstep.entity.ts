import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('process_steps')
@Index(['routingId', 'deletedAt'])
export class ProcessStep extends IndustrialBaseEntity {
  @Column({ name: 'routing_id', type: 'uuid' })
  routingId: string;

  @Column({ name: 'step_number', type: 'int' })
  stepNumber: number;

  @Column({ name: 'step_name', type: 'varchar', length: 200 })
  stepName: string;

  @Column({ name: 'step_description', type: 'text', nullable: true })
  stepDescription: string | null;

  @Column({ name: 'tool_required', type: 'varchar', length: 100, nullable: true })
  toolRequired: string | null;

  @Column({ name: 'fixture_required', type: 'varchar', length: 100, nullable: true })
  fixtureRequired: string | null;

  @Column({ name: 'estimated_time_minutes', type: 'decimal', precision: 8, scale: 2, nullable: true })
  estimatedTimeMinutes: number | null;

  @Column({ name: 'quality_checkpoints', type: 'jsonb', nullable: true })
  qualityCheckpoints: string[] | null;

  @Column({ name: 'is_critical', type: 'boolean', default: false })
  isCritical: boolean;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}