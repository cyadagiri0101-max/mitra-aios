import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ComplianceFramework {
  ISO_9001 = 'ISO_9001',
  AS9100 = 'AS9100',
  IATF_16949 = 'IATF_16949',
}

export enum PackageCompletenessStatus {
  COMPLETE = 'COMPLETE',
  PARTIAL = 'PARTIAL',
  MISSING = 'MISSING',
  INVALID = 'INVALID',
  SUPERSEDED = 'SUPERSEDED',
}

@Entity('compliance_packages')
@Index(['tenantId', 'projectId'])
@Index(['tenantId', 'packageHash'])
export class CompliancePackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: ComplianceFramework.ISO_9001,
  })
  framework: string;

  @Column({ type: 'varchar', length: 100, default: 'FULL_PROJECT_TRACEABILITY' })
  scope: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'completeness_status',
    default: PackageCompletenessStatus.COMPLETE,
  })
  completenessStatus: string;

  @Column({ type: 'varchar', length: 64, name: 'package_hash' })
  packageHash: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'generator_version',
    default: 'MITRA_EKOS_COMPLIANCE_v5.0',
  })
  generatorVersion: string;

  @Column({ type: 'jsonb', name: 'evidence_manifest', default: [] })
  evidenceManifest: Record<string, any>[];

  @Column({ type: 'jsonb', name: 'lineage_manifest', default: [] })
  lineageManifest: Record<string, any>[];

  @Column({ type: 'jsonb', name: 'audit_manifest', default: [] })
  auditManifest: Record<string, any>[];

  @Column({ type: 'jsonb', name: 'gaps_and_warnings', default: [] })
  gapsAndWarnings: Record<string, any>[];

  @Column({ type: 'uuid', name: 'created_by_user_id', nullable: true })
  createdByUserId: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
