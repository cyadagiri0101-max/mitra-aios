import {
  Entity, Column, Index,
} from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('ai_usage_records')
@Index(['userId', 'createdAt'])
@Index(['modelName', 'createdAt'])
export class AiUsageRecord extends IndustrialBaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ name: 'model_name', type: 'varchar', length: 100 })
  modelName: string;

  @Column({ name: 'response_time_ms', type: 'int', nullable: true })
  responseTimeMs: number | null;

  @Column({ name: 'token_estimate', type: 'int', nullable: true })
  tokenEstimate: number | null;
}
