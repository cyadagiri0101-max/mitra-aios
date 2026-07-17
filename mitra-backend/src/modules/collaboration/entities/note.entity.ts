import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('notes')
@Index(['entityType', 'entityId', 'deletedAt'])
export class Note extends IndustrialBaseEntity {
  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  @Index()
  entityId: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  title: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'note_type', type: 'varchar', length: 30, default: 'GENERAL' })
  noteType: string;

  @Column({ name: 'is_pinned', type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ name: 'is_internal', type: 'boolean', default: true })
  isInternal: boolean;

  @Column({ name: 'visibility_roles', type: 'jsonb', nullable: true })
  visibilityRoles: string[] | null;

  @Column({ name: 'mentioned_users', type: 'jsonb', nullable: true })
  mentionedUsers: string[] | null;
}