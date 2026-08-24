import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('design_dependencies')
@Index('IDX_DESIGN_DEPENDENCY_TENANT_PROJ', ['tenantId', 'projectId'])
export class DesignDependency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'project_id', type: 'varchar', length: 100 })
  projectId: string;

  @Column({ name: 'source_stage', type: 'varchar', length: 100 })
  sourceStage: string;

  @Column({ name: 'target_stage', type: 'varchar', length: 100 })
  targetStage: string;

  @Column({ name: 'category', type: 'varchar', length: 50, default: 'ENGINEERING' })
  category: 'CUSTOMER' | 'PROJECT' | 'ENGINEERING' | 'DESIGN' | 'MATERIAL' | 'MANUFACTURING' | 'QUALITY' | 'PROGRAMMING' | 'TOOL_PROVING' | 'APPROVAL' | 'EXTERNAL';

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'is_blocking', type: 'boolean', default: true })
  isBlocking: boolean;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'ACTIVE' })
  status: 'ACTIVE' | 'RESOLVED' | 'WAIVED';

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
