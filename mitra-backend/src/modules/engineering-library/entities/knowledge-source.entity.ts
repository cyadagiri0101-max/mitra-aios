import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { AuthorityStatus, EngineeringAssetClassification } from '../types/engineering-library-scan.types';

export enum KnowledgeSourceType {
  MEKB_DATABASE = 'MEKB_DATABASE',
  TECHNICAL_DOCUMENT = 'TECHNICAL_DOCUMENT',
  MASTER_WORKBOOK = 'MASTER_WORKBOOK',
  PARSER_SOURCE = 'PARSER_SOURCE',
  SPREADSHEET_DATA = 'SPREADSHEET_DATA',
  OTHER = 'OTHER',
}

export enum KnowledgeSourceStatus {
  ACTIVE = 'ACTIVE',
  SUPERSEDED = 'SUPERSEDED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('knowledge_sources')
@Index(['tenantId', 'sha256', 'relativePath'], { unique: true })
@Index(['tenantId', 'projectNumber'])
@Index(['tenantId', 'sourceType', 'currentStatus'])
export class KnowledgeSource extends IndustrialBaseEntity {
  @Column({ name: 'source_type', type: 'varchar', length: 50, default: KnowledgeSourceType.TECHNICAL_DOCUMENT })
  sourceType: KnowledgeSourceType;

  @Column({ name: 'source_file', type: 'varchar', length: 300 })
  sourceFile: string;

  @Column({ name: 'relative_path', type: 'varchar', length: 500 })
  relativePath: string;

  @Column({ name: 'sha256', type: 'varchar', length: 64 })
  sha256: string;

  @Column({ name: 'file_size', type: 'bigint', default: 0 })
  fileSize: number;

  @Column({ name: 'last_modified', type: 'timestamptz', nullable: true })
  lastModified: Date | null;

  @Column({ name: 'classification', type: 'varchar', length: 50, default: EngineeringAssetClassification.ENGINEERING_DATA })
  classification: EngineeringAssetClassification;

  @Column({ name: 'authority_status', type: 'varchar', length: 50, default: AuthorityStatus.AUTHORITATIVE_RELEASE })
  authorityStatus: AuthorityStatus;

  @Column({ name: 'authority_reason', type: 'text', nullable: true })
  authorityReason: string | null;

  @Column({ name: 'project_number', type: 'varchar', length: 50, nullable: true })
  projectNumber: string | null;

  @Column({ name: 'project_prefix', type: 'varchar', length: 20, nullable: true })
  projectPrefix: string | null;

  @Column({ name: 'customer', type: 'varchar', length: 200, nullable: true })
  customer: string | null;

  @Column({ name: 'document_type', type: 'varchar', length: 80, nullable: true })
  documentType: string | null;

  @Column({ name: 'machine', type: 'varchar', length: 100, nullable: true })
  machine: string | null;

  @Column({ name: 'material', type: 'varchar', length: 100, nullable: true })
  material: string | null;

  @Column({ name: 'component_type', type: 'varchar', length: 100, nullable: true })
  componentType: string | null;

  @Column({ name: 'revision', type: 'varchar', length: 30, nullable: true })
  revision: string | null;

  @Column({ name: 'scanner_version', type: 'varchar', length: 50, nullable: true })
  scannerVersion: string | null;

  @Column({ name: 'scan_batch_id', type: 'varchar', length: 100, nullable: true })
  scanBatchId: string | null;

  @Column({ name: 'first_seen_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  firstSeenAt: Date;

  @Column({ name: 'last_seen_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  lastSeenAt: Date;

  @Column({ name: 'current_status', type: 'varchar', length: 50, default: KnowledgeSourceStatus.ACTIVE })
  currentStatus: KnowledgeSourceStatus;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
