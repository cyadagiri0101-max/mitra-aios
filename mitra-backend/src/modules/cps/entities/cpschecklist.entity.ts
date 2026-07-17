import { Entity, Column, Index} from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('cps_checklists')
export class CPSChecklist extends IndustrialBaseEntity {
  @Column({ name: 'checklist_code', type: 'varchar', length: 30, unique: true })
  checklistCode: string;

  @Column({ name: 'checklist_name', type: 'varchar', length: 200 })
  checklistName: string;

  @Column({ name: 'mold_type', type: 'varchar', length: 50, nullable: true })
  moldType: string | null;

  @Column({ type: 'varchar', length: 10, default: '1.0' })
  version: string;

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: Date | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'total_items', type: 'int', default: 0 })
  totalItems: number;

  @Column({ name: 'categories', type: 'jsonb', nullable: true })
  categories: string[] | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}