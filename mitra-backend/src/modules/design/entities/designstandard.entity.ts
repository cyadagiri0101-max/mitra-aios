import { Entity, Column, Index} from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('design_standards')
export class DesignStandard extends IndustrialBaseEntity {
  @Column({ name: 'standard_code', type: 'varchar', length: 50 })
  standardCode: string;

  @Column({ name: 'standard_name', type: 'varchar', length: 200 })
  standardName: string;

  @Column({ name: 'issuing_body', type: 'varchar', length: 100, nullable: true })
  issuingBody: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  version: string | null;

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: Date | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date | null;

  @Column({ name: 'applies_to', type: 'simple-array', nullable: true })
  appliesTo: string[] | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_mandatory', type: 'boolean', default: false })
  isMandatory: boolean;

  @Column({ name: 'document_path', type: 'varchar', length: 500, nullable: true })
  documentPath: string | null;
}