import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { DesignChecklistItem } from './design-checklist-item.entity';

@Entity('design_checklists')
@Index('IDX_DESIGN_CHECKLIST_TENANT_PKG_STAGE', ['tenantId', 'packageId', 'stage'])
export class DesignChecklist {
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

  @Column({ name: 'checklist_type', type: 'varchar', length: 100 })
  checklistType: string;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'PENDING' })
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';

  @Column({ name: 'mandatory_items_total', type: 'int', default: 0 })
  mandatoryItemsTotal: number;

  @Column({ name: 'mandatory_items_completed', type: 'int', default: 0 })
  mandatoryItemsCompleted: number;

  @Column({ name: 'all_mandatory_passed', type: 'boolean', default: false })
  allMandatoryPassed: boolean;

  @OneToMany(() => DesignChecklistItem, (item) => item.checklist, { cascade: true })
  items: DesignChecklistItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
