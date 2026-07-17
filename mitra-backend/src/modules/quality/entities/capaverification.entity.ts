import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum CapaStatus { OPEN='OPEN', IN_PROGRESS='IN_PROGRESS', IMPLEMENTED='IMPLEMENTED', VERIFIED='VERIFIED', CLOSED='CLOSED', REJECTED='REJECTED' }
export enum CapaType { CORRECTIVE='CORRECTIVE', PREVENTIVE='PREVENTIVE' }

@Entity('capa_verifications')
@Index(['capaNumber', 'deletedAt'])
@Index(['projectId', 'status', 'deletedAt'])
export class CapaVerification extends IndustrialBaseEntity {
  @Column({ name: 'capa_number', type: 'varchar', length: 30, unique: true })
  capaNumber: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  @Index()
  projectId: string | null;

  @Column({ name: 'trial_id', type: 'uuid', nullable: true })
  @Index()
  trialId: string | null;

  @Column({ name: 'capa_type', type: 'enum', enum: CapaType, default: CapaType.CORRECTIVE })
  capaType: CapaType;

  @Column({ name: 'problem_description', type: 'text' })
  problemDescription: string;

  @Column({ name: 'root_cause', type: 'text', nullable: true })
  rootCause: string | null;

  @Column({ name: 'root_cause_method', type: 'varchar', length: 50, nullable: true })
  rootCauseMethod: string | null;

  @Column({ name: 'corrective_action', type: 'text', nullable: true })
  correctiveAction: string | null;

  @Column({ name: 'preventive_action', type: 'text', nullable: true })
  preventiveAction: string | null;

  @Column({ name: 'responsible_person_id', type: 'uuid', nullable: true })
  @Index()
  responsiblePersonId: string | null;

  @Column({ name: 'target_date', type: 'date', nullable: true })
  targetDate: Date | null;

  @Column({ name: 'implementation_date', type: 'date', nullable: true })
  implementationDate: Date | null;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;

  @Column({ name: 'verification_date', type: 'date', nullable: true })
  verificationDate: Date | null;

  @Column({ name: 'verification_evidence', type: 'text', nullable: true })
  verificationEvidence: string | null;

  @Column({ name: 'effectiveness_confirmed', type: 'boolean', nullable: true })
  effectivenessConfirmed: boolean | null;

  @Column({ type: 'enum', enum: CapaStatus, default: CapaStatus.OPEN })
  status: CapaStatus;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;
}