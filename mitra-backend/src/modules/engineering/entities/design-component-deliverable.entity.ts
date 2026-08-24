import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DesignComponent } from './design-component.entity';

@Entity('design_component_deliverables')
@Index('IDX_COMP_DELIV_TENANT_COMP', ['tenantId', 'componentId'])
export class DesignComponentDeliverable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'component_id', type: 'uuid' })
  componentId: string;

  @ManyToOne(() => DesignComponent, (comp) => comp.deliverables, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'component_id' })
  component: DesignComponent;

  @Column({ name: 'deliverable_type', type: 'varchar', length: 100 })
  deliverableType: '3D_DEVELOPMENT' | 'DETAILING' | 'VERIFICATION' | '3D_DTP' | '2D_PDF' | 'SUBMISSION' | 'PROCESS_PLANNING' | 'ELECTRODE_EXTRACTION' | 'FIXTURE_DESIGN' | 'FINAL_PART_LIST';

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'planned_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  plannedUnits: number;

  @Column({ name: 'actual_units', type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  actualUnits: number;

  @Column({ name: 'responsible_engineer_id', type: 'varchar', length: 100, nullable: true })
  responsibleEngineerId: string;

  @Column({ type: 'varchar', length: 50, default: 'NOT_STARTED' })
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

  @Column({ name: 'completion_timestamp', type: 'timestamptz', nullable: true })
  completionTimestamp: Date;

  @Column({ name: 'evidence_reference', type: 'varchar', length: 255, nullable: true })
  evidenceReference: string;

  @Column({ name: 'reviewer_notes', type: 'text', nullable: true })
  reviewerNotes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
