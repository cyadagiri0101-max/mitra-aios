import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('task_comments')
@Index(['taskId', 'deletedAt'])
export class TaskComment extends IndustrialBaseEntity {
  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  authorId: string | null;

  @Column({ name: 'author_name', type: 'varchar', length: 200, nullable: true })
  authorName: string | null;

  @Column({ type: 'text' })
  body: string;
}
