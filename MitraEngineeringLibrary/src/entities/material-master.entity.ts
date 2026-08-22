import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntityWithDates } from './base-entity';
import { TechnicalSpecification } from './technical-specification.entity';

@Entity({ name: 'material_master' })
export class MaterialMaster extends BaseEntityWithDates {
  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  sourceFile!: string | null;

  @OneToMany(() => TechnicalSpecification, (spec) => spec.material)
  technicalSpecifications?: TechnicalSpecification[];
}
