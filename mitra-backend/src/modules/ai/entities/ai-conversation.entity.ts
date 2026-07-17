import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

/**
 * Persists AI chat conversation sessions per user / tenant.
 * Matches the ai_conversations table created in Migration 002.
 */
@Entity('ai_conversations')
@Index(['tenantId', 'deletedAt'])
export class AiConversation extends IndustrialBaseEntity {
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  title: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  intent: string | null;

  @Column({ name: 'message_count', type: 'int', default: 0 })
  messageCount: number;

  @Column({ name: 'is_pinned', type: 'boolean', default: false })
  isPinned: boolean;
}