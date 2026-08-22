import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntityWithDates } from './base-entity';
import { ProjectMaster } from './project-master.entity';

@Entity({ name: 'cycle_time_history' })
export class CycleTimeHistory extends BaseEntityWithDates {
  @ManyToOne(() => ProjectMaster, (project) => project.documents, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project?: ProjectMaster | null;

  @Column({ nullable: true })
  cycleTime!: string | null;

  @Column({ nullable: true })
  sourceFile!: string | null;

  @Column({ nullable: true })
  worksheet!: string | null;

  @Column({ nullable: true })
  rowNumber!: number | null;

  @Column({ nullable: true })
  revision!: string | null;
}
