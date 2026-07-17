import { Entity, Column, Index} from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('operations')
export class Operation extends IndustrialBaseEntity {
  @Column({ name: 'operation_code', type: 'varchar', length: 20, unique: true })
  operationCode: string;

  @Column({ name: 'operation_name', type: 'varchar', length: 200 })
  operationName: string;

  @Column({ name: 'operation_category', type: 'varchar', length: 50, nullable: true })
  operationCategory: string | null;

  @Column({ name: 'machine_type_id', type: 'uuid', nullable: true })
  @Index()
  machineTypeId: string | null;

  @Column({ name: 'setup_time_minutes', type: 'int', default: 0 })
  setupTimeMinutes: number;

  @Column({ name: 'cycle_time_minutes', type: 'decimal', precision: 8, scale: 2, default: 0 })
  cycleTimeMinutes: number;

  @Column({ name: 'standard_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  standardCost: number | null;

  @Column({ name: 'skill_level', type: 'varchar', length: 20, default: 'BASIC' })
  skillLevel: string;

  @Column({ name: 'is_outsourced', type: 'boolean', default: false })
  isOutsourced: boolean;

  @Column({ name: 'vendor_id', type: 'uuid', nullable: true })
  @Index()
  vendorId: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}