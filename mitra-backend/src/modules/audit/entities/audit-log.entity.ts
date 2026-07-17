import {
  Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index,
} from 'typeorm';

export enum AuditEventType {
  CRUD = 'CRUD',
  AUTH = 'AUTH',
  AI = 'AI',
  BUSINESS = 'BUSINESS',
}

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['userId', 'createdAt'])
@Index(['action', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 100 })
  @Index()
  entityId: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ name: 'event_type', type: 'enum', enum: AuditEventType, default: AuditEventType.CRUD })
  eventType: AuditEventType;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index()
  userId: string | null;

  @Column({ name: 'user_email', type: 'varchar', length: 255, nullable: true })
  userEmail: string | null;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ name: 'before_state', type: 'jsonb', nullable: true })
  beforeState: Record<string, unknown> | null;

  @Column({ name: 'after_state', type: 'jsonb', nullable: true })
  afterState: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}