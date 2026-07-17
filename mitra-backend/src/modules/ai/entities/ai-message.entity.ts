import {
  Entity, Column, Index, ManyToOne, JoinColumn,
  PrimaryGeneratedColumn, CreateDateColumn,
} from 'typeorm';
import { AiConversation } from './ai-conversation.entity';

/**
 * An individual message within an AI conversation.
 * Immutable records — no soft delete.
 * Matches the ai_messages table created in Migration 002.
 */
@Entity('ai_messages')
@Index(['conversationId', 'createdAt'])
export class AiMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'conversation_id', type: 'uuid' })
  @Index()
  conversationId: string;

  @Column({ type: 'varchar', length: 20 })
  role: string; // 'user' | 'assistant' | 'system'

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  intent: string | null;

  @Column({ name: 'model_used', type: 'varchar', length: 100, nullable: true })
  modelUsed: string | null;

  @Column({ name: 'processing_ms', type: 'int', nullable: true })
  processingMs: number | null;

  @Column({ name: 'context_refs', type: 'jsonb', nullable: true })
  contextRefs: Record<string, unknown> | null;

  @ManyToOne(() => AiConversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: AiConversation;
}