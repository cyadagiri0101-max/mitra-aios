import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('cps_requirements')
@Index(['checklistId', 'deletedAt'])
export class CPSRequirement extends IndustrialBaseEntity {
  @Column({ name: 'checklist_id', type: 'uuid' })
  checklistId: string;

  @Column({ name: 'item_code', type: 'varchar', length: 20 })
  itemCode: string;

  @Column({ name: 'category', type: 'varchar', length: 50 })
  category: string;

  @Column({ name: 'item_description', type: 'text' })
  itemDescription: string;

  @Column({ name: 'acceptance_criteria', type: 'text', nullable: true })
  acceptanceCriteria: string | null;

  @Column({ name: 'reference_standard', type: 'varchar', length: 100, nullable: true })
  referenceStandard: string | null;

  @Column({ name: 'is_mandatory', type: 'boolean', default: true })
  isMandatory: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'applies_to_mold_types', type: 'jsonb', nullable: true })
  appliesToMoldTypes: string[] | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}