import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntityWithDates } from './base-entity';
import { ProjectMaster } from './project-master.entity';

@Entity({ name: 'ai_tag' })
export class AITag extends BaseEntityWithDates {
  @ManyToOne(() => ProjectMaster, (project) => project.documents, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project?: ProjectMaster | null;

  @Column()
  tag!: string;

  @Column({ nullable: true })
  sourceFile!: string | null;

  @Column({ nullable: true })
  worksheet!: string | null;

  @Column({ nullable: true })
  rowNumber!: number | null;

  @Column({ nullable: true })
  revision!: string | null;
}
