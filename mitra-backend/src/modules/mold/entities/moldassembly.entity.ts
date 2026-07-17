import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('mold_assemblies')
@Index(['moldId', 'deletedAt'])
export class MoldAssembly extends IndustrialBaseEntity {
  @Column({ name: 'mold_id', type: 'uuid' })
  moldId: string;

  @Column({ name: 'assembly_name', type: 'varchar', length: 100 })
  assemblyName: string;

  @Column({ name: 'assembly_type', type: 'varchar', length: 50 })
  assemblyType: string;

  @Column({ name: 'parent_assembly_id', type: 'uuid', nullable: true })
  @Index()
  parentAssemblyId: string | null;

  @Column({ name: 'sequence', type: 'int', default: 1 })
  sequence: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}