import { Entity, Column, Index} from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('notification_templates')
export class NotificationTemplate extends IndustrialBaseEntity {
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text' })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', length: 20, default: 'email' })
  channel: string;

  @Column({ type: 'jsonb', nullable: true })
  variables: Record<string, any> | null;
}