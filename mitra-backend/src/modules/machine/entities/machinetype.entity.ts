import { Entity, Column, Index} from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('machine_types')
export class MachineType extends IndustrialBaseEntity {
  @Column({ name: 'type_code', type: 'varchar', length: 20, unique: true })
  typeCode: string;

  @Column({ name: 'type_name', type: 'varchar', length: 100 })
  typeName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'standard_cost_per_hour', type: 'decimal', precision: 10, scale: 2, nullable: true })
  standardCostPerHour: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}