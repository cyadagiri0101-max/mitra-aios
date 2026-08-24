import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export interface ReconciliationDiscrepancyItem {
  itemType: 'DELIVERABLE' | 'EVIDENCE' | 'STATUS' | 'REVISION' | 'CHECKLIST';
  identifier: string;
  trackingSheetStatus?: string;
  mitraStatus?: string;
  evidenceFound: boolean;
  isVerified: boolean;
  discrepancyReason: string;
  suggestedAction: string;
}

@Entity('tracking_sheet_reconciliations')
@Index('IDX_SHEET_RECON_TENANT_PROJ', ['tenantId', 'projectId'])
export class TrackingSheetReconciliation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'project_id', type: 'varchar', length: 100 })
  projectId: string;

  @Column({ name: 'tracking_sheet_id', type: 'uuid' })
  trackingSheetId: string;

  @Column({ name: 'total_reconciled_items', type: 'int', default: 0 })
  totalReconciledItems: number;

  @Column({ name: 'fully_verified_items_count', type: 'int', default: 0 })
  fullyVerifiedItemsCount: number;

  @Column({ name: 'missing_evidence_count', type: 'int', default: 0 })
  missingEvidenceCount: number;

  @Column({ name: 'unverified_completion_count', type: 'int', default: 0 })
  unverifiedCompletionCount: number;

  @Column({ name: 'status_mismatch_count', type: 'int', default: 0 })
  statusMismatchCount: number;

  @Column({ name: 'reconciliation_status', type: 'varchar', length: 50, default: 'RECONCILED' })
  reconciliationStatus: 'RECONCILED' | 'DISCREPANCIES_FOUND' | 'CRITICAL_GAPS';

  @Column({ type: 'jsonb', default: [] })
  discrepancies: ReconciliationDiscrepancyItem[];

  @CreateDateColumn({ name: 'reconciled_at' })
  reconciledAt: Date;
}
