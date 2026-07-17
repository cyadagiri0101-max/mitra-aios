import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum FieldType { TEXT='TEXT', NUMBER='NUMBER', DATE='DATE', BOOLEAN='BOOLEAN', SELECT='SELECT', MULTISELECT='MULTISELECT', URL='URL' }

@Entity('custom_fields')
@Index(['entityType', 'fieldKey', 'deletedAt'])
export class CustomField extends IndustrialBaseEntity {
  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: string;

  @Column({ name: 'field_key', type: 'varchar', length: 50 })
  fieldKey: string;

  @Column({ name: 'field_label', type: 'varchar', length: 100 })
  fieldLabel: string;

  @Column({ name: 'field_type', type: 'enum', enum: FieldType, default: FieldType.TEXT })
  fieldType: FieldType;

  @Column({ name: 'is_required', type: 'boolean', default: false })
  isRequired: boolean;

  @Column({ name: 'is_searchable', type: 'boolean', default: false })
  isSearchable: boolean;

  @Column({ name: 'show_in_list', type: 'boolean', default: false })
  showInList: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'default_value', type: 'varchar', length: 255, nullable: true })
  defaultValue: string | null;

  @Column({ name: 'select_options', type: 'jsonb', nullable: true })
  selectOptions: string[] | null;

  @Column({ name: 'validation_regex', type: 'varchar', length: 255, nullable: true })
  validationRegex: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}