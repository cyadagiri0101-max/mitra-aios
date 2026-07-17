import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('design_boms')
@Index(['parentPartId', 'deletedAt'])
export class DesignBom extends IndustrialBaseEntity {
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ name: 'parent_part_id', type: 'uuid' })
  @Index()
  parentPartId: string;

  @Column({ name: 'child_part_id', type: 'uuid' })
  @Index()
  childPartId: string;

  @Column({ name: 'level', type: 'int', default: 1 })
  level: number;

  @Column({ name: 'sequence', type: 'int', default: 1 })
  sequence: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 1 })
  quantity: number;

  @Column({ type: 'varchar', length: 20, default: 'NOS' })
  unit: string;

  @Column({ name: 'find_number', type: 'varchar', length: 20, nullable: true })
  findNumber: string | null;

  @Column({ name: 'reference_designator', type: 'varchar', length: 100, nullable: true })
  referenceDesignator: string | null;

  @Column({ name: 'is_phantom', type: 'boolean', default: false })
  isPhantom: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}