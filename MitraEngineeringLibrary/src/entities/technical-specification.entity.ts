import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntityWithDates } from './base-entity';
import { MachineMaster } from './machine-master.entity';
import { MaterialMaster } from './material-master.entity';
import { NeckTypeMaster } from './neck-type-master.entity';
import { ProjectMaster } from './project-master.entity';

@Entity({ name: 'technical_specification' })
export class TechnicalSpecification extends BaseEntityWithDates {
  @Column({ nullable: true })
  capacity!: string | null;

  @ManyToOne(() => MachineMaster, (machine) => machine.technicalSpecifications, { nullable: true, cascade: true })
  @JoinColumn({ name: 'machine_id' })
  machine?: MachineMaster | null;

  @ManyToOne(() => MaterialMaster, (material) => material.technicalSpecifications, { nullable: true, cascade: true })
  @JoinColumn({ name: 'material_id' })
  material?: MaterialMaster | null;

  @ManyToOne(() => NeckTypeMaster, (neckType) => neckType.technicalSpecifications, { nullable: true, cascade: true })
  @JoinColumn({ name: 'neck_type_id' })
  neckType?: NeckTypeMaster | null;

  @Column({ nullable: true })
  moldType!: string | null;

  @Column({ nullable: true })
  cavitation!: string | null;

  @OneToMany(() => ProjectMaster, (project) => project.technicalSpecification)
  projects?: ProjectMaster[];
}
