import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum DependencyType {
  FINISH_TO_START = 'FINISH_TO_START',
  FINISH_TO_FINISH = 'FINISH_TO_FINISH',
  START_TO_START = 'START_TO_START',
  START_TO_FINISH = 'START_TO_FINISH',
}

/** Directed dependency: task depends on dependsOnTaskId. */
@Entity('task_dependencies')
@Index(['taskId', 'deletedAt'])
export class TaskDependency extends IndustrialBaseEntity {
  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ name: 'depends_on_task_id', type: 'uuid' })
  @Index()
  dependsOnTaskId: string;

  @Column({ name: 'dependency_type', type: 'varchar', length: 20, default: DependencyType.FINISH_TO_START })
  dependencyType: DependencyType;
}
