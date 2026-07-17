import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('custom_field_values')
@Index(['fieldId', 'entityId', 'deletedAt'])
@Index(['entityType', 'entityId', 'deletedAt'])
export class CustomFieldValue extends IndustrialBaseEntity {
  @Column({ name: 'field_id', type: 'uuid' })
  fieldId: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  @Index()
  entityId: string;

  @Column({ name: 'string_value', type: 'text', nullable: true })
  stringValue: string | null;

  @Column({ name: 'number_value', type: 'decimal', precision: 18, scale: 4, nullable: true })
  numberValue: number | null;

  @Column({ name: 'date_value', type: 'date', nullable: true })
  dateValue: Date | null;

  @Column({ name: 'boolean_value', type: 'boolean', nullable: true })
  booleanValue: boolean | null;

  @Column({ name: 'json_value', type: 'jsonb', nullable: true })
  jsonValue: any | null;
}