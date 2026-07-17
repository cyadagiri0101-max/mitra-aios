import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('activity_logs')
@Index(['entityType', 'entityId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class ActivityLog extends IndustrialBaseEntity {
  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  @Index()
  entityId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index()
  userId: string | null;

  @Column({ name: 'user_name', type: 'varchar', length: 100, nullable: true })
  userName: string | null;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, { from: any; to: any }> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}