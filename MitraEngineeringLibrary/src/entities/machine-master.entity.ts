import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntityWithDates } from './base-entity';
import { TechnicalSpecification } from './technical-specification.entity';

@Entity({ name: 'machine_master' })
export class MachineMaster extends BaseEntityWithDates {
  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  sourceFile!: string | null;

  @OneToMany(() => TechnicalSpecification, (spec) => spec.machine)
  technicalSpecifications?: TechnicalSpecification[];
}
