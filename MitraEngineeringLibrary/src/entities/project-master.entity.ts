import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntityWithDates } from './base-entity';
import { CustomerMaster } from './customer-master.entity';
import { ProductMaster } from './product-master.entity';
import { TechnicalSpecification } from './technical-specification.entity';
import { ImportContext } from './import-context.entity';
import { EngineeringDocument } from './engineering-document.entity';

@Entity({ name: 'project_master' })
export class ProjectMaster extends BaseEntityWithDates {
  @Column({ unique: true })
  projectCode!: string;

  @ManyToOne(() => CustomerMaster, (customer) => customer.projects, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: CustomerMaster | null;

  @ManyToOne(() => ProductMaster, (product) => product.projects, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: ProductMaster | null;

  @ManyToOne(() => TechnicalSpecification, (spec) => spec.projects, { nullable: true, cascade: true })
  @JoinColumn({ name: 'technical_specification_id' })
  technicalSpecification?: TechnicalSpecification | null;

  @ManyToOne(() => ImportContext, (context) => context.projects, { nullable: true, cascade: true })
  @JoinColumn({ name: 'import_context_id' })
  importContext?: ImportContext | null;

  @OneToMany(() => EngineeringDocument, (doc) => doc.project)
  documents?: EngineeringDocument[];
}
