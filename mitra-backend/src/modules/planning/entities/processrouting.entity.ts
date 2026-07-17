import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('process_routings')
@Index(['planId', 'deletedAt'])
export class ProcessRouting extends IndustrialBaseEntity {
  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @Column({ name: 'routing_number', type: 'varchar', length: 30, unique: true })
  routingNumber: string;

  @Column({ name: 'sequence_number', type: 'int' })
  sequenceNumber: number;

  @Column({ name: 'operation_id', type: 'uuid', nullable: true })
  @Index()
  operationId: string | null;

  @Column({ name: 'operation_name', type: 'varchar', length: 200 })
  operationName: string;

  @Column({ name: 'machine_type_id', type: 'uuid', nullable: true })
  @Index()
  machineTypeId: string | null;

  @Column({ name: 'work_centre', type: 'varchar', length: 50, nullable: true })
  workCentre: string | null;

  @Column({ name: 'setup_time_hours', type: 'decimal', precision: 6, scale: 2, default: 0 })
  setupTimeHours: number;

  @Column({ name: 'run_time_hours', type: 'decimal', precision: 6, scale: 2, default: 0 })
  runTimeHours: number;

  @Column({ name: 'queue_time_hours', type: 'decimal', precision: 6, scale: 2, default: 0 })
  queueTimeHours: number;

  @Column({ name: 'standard_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  standardCost: number | null;

  @Column({ name: 'is_outsourced', type: 'boolean', default: false })
  isOutsourced: boolean;

  @Column({ name: 'vendor_id', type: 'uuid', nullable: true })
  @Index()
  vendorId: string | null;

  @Column({ type: 'text', nullable: true })
  instructions: string | null;
}