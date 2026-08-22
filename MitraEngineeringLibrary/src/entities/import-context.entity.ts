import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntityWithDates } from './base-entity';
import { ProjectMaster } from './project-master.entity';

@Entity({ name: 'import_context' })
export class ImportContext extends BaseEntityWithDates {
  @Column()
  sourceFile!: string;

  @Column({ nullable: true })
  worksheet!: string | null;

  @Column({ nullable: true })
  rowNumber!: number | null;

  @Column({ nullable: true })
  revision!: string | null;

  @OneToMany(() => ProjectMaster, (project) => project.importContext)
  projects?: ProjectMaster[];
}
