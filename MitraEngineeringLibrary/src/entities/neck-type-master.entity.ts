import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntityWithDates } from './base-entity';
import { TechnicalSpecification } from './technical-specification.entity';

@Entity({ name: 'neck_type_master' })
export class NeckTypeMaster extends BaseEntityWithDates {
  @Column({ unique: true })
  type!: string;

  @Column({ nullable: true })
  sourceFile!: string | null;

  @OneToMany(() => TechnicalSpecification, (spec) => spec.neckType)
  technicalSpecifications?: TechnicalSpecification[];
}
