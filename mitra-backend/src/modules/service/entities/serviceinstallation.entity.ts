import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ServiceInstallationStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  HOLD = 'HOLD',
  CANCELLED = 'CANCELLED',
}

@Entity('service_installations')
@Index(['installationNumber', 'deletedAt'])
@Index(['serviceRequestId', 'deletedAt'])
@Index(['projectId', 'deletedAt'])
export class ServiceInstallation extends IndustrialBaseEntity {
  @Column({ name: 'installation_number', type: 'varchar', length: 30, unique: true })
  installationNumber: string;

  @Column({ name: 'service_request_id', type: 'uuid', nullable: true })
  @Index()
  serviceRequestId: string | null;

  @Column({ name: 'dispatch_id', type: 'uuid', nullable: true })
  @Index()
  dispatchId: string | null;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  @Index()
  customerId: string | null;

  @Column({ name: 'site_readiness', type: 'text', nullable: true })
  siteReadiness: string | null;

  @Column({ name: 'installation_date', type: 'date', nullable: true })
  installationDate: Date | null;

  @Column({ name: 'completion_date', type: 'date', nullable: true })
  completionDate: Date | null;

  @Column({ name: 'checklist', type: 'jsonb', nullable: true })
  checklist: Record<string, unknown>[] | null;

  @Column({ name: 'installation_report', type: 'text', nullable: true })
  installationReport: string | null;

  @Column({ name: 'site_photos', type: 'jsonb', nullable: true })
  sitePhotos: string[] | null;

  @Column({ name: 'customer_signoff', type: 'boolean', default: false })
  customerSignoff: boolean;

  @Column({ name: 'signoff_by', type: 'varchar', length: 100, nullable: true })
  signoffBy: string | null;

  @Column({ type: 'enum', enum: ServiceInstallationStatus, default: ServiceInstallationStatus.SCHEDULED })
  status: ServiceInstallationStatus;
}
