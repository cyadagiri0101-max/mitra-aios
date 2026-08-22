import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntityWithDates } from './base-entity';
import { ProjectMaster } from './project-master.entity';

@Entity({ name: 'customer_master' })
export class CustomerMaster extends BaseEntityWithDates {
  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  sourceFile!: string | null;

  @OneToMany(() => ProjectMaster, (project) => project.customer)
  projects?: ProjectMaster[];
}
