import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntityWithDates } from './base-entity';
import { BottleFamily } from './bottle-family.entity';
import { ProjectMaster } from './project-master.entity';

@Entity({ name: 'product_master' })
export class ProductMaster extends BaseEntityWithDates {
  @Column({ unique: true })
  name!: string;

  @ManyToOne(() => BottleFamily, (family) => family.products, { nullable: true, cascade: true })
  @JoinColumn({ name: 'bottle_family_id' })
  bottleFamily?: BottleFamily | null;

  @Column({ nullable: true })
  description!: string | null;

  @Column({ nullable: true })
  sourceFile!: string | null;

  @OneToMany(() => ProjectMaster, (project) => project.product)
  projects?: ProjectMaster[];
}
