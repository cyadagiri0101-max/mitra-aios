import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('design_blockers')
@Index('IDX_DESIGN_BLOCKER_TENANT_PROJ_STAGE', ['tenantId', 'projectId', 'stage'])
export class DesignBlocker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'project_id', type: 'varchar', length: 100 })
  projectId: string;

  @Column({ name: 'package_id', type: 'uuid', nullable: true })
  packageId: string;

  @Column({ name: 'stage', type: 'varchar', length: 100 })
  stage: string;

  @Column({ name: 'blocker_code', type: 'varchar', length: 100 })
  blockerCode: string;

  @Column({ name: 'category', type: 'varchar', length: 50, default: 'ENGINEERING' })
  category: 'CUSTOMER' | 'PROJECT' | 'ENGINEERING' | 'DESIGN' | 'MATERIAL' | 'MANUFACTURING' | 'QUALITY' | 'PROGRAMMING' | 'TOOL_PROVING' | 'APPROVAL' | 'EXTERNAL';

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'impact_severity', type: 'varchar', length: 50, default: 'HIGH' })
  impactSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'ACTIVE' })
  status: 'ACTIVE' | 'RESOLVED' | 'WAIVED';

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string;

  @Column({ name: 'evidence_reference', type: 'varchar', length: 255, nullable: true })
  evidenceReference: string;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
