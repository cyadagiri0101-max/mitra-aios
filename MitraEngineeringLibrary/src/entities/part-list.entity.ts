import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntityWithDates } from './base-entity';
import { ProjectMaster } from './project-master.entity';

@Entity({ name: 'part_list' })
export class PartList extends BaseEntityWithDates {
  @ManyToOne(() => ProjectMaster, (project) => project.documents, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project?: ProjectMaster | null;

  @Column()
  partNumber!: string;

  @Column({ nullable: true })
  description!: string | null;

  @Column({ nullable: true })
  quantity!: number | null;

  @Column({ nullable: true })
  sourceFile!: string | null;

  @Column({ nullable: true })
  worksheet!: string | null;

  @Column({ nullable: true })
  rowNumber!: number | null;

  @Column({ nullable: true })
  revision!: string | null;
}
