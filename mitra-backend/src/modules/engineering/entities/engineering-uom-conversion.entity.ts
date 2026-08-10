import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum UomConversionType {
  EXACT = 'EXACT',
  ROUNDED = 'ROUNDED',
  APPROXIMATE = 'APPROXIMATE',
}

/**
 * Unit-of-measure conversion catalog (G-8). Conversion factor multiplies a
 * quantity expressed in `fromUom` to yield the value in `toUom`.
 */
@Entity('uom_conversions')
@Index(['fromUom', 'deletedAt'])
export class EngineeringUomConversion extends IndustrialBaseEntity {
  @Column({ name: 'from_uom', type: 'varchar', length: 20 })
  fromUom: string;

  @Column({ name: 'to_uom', type: 'varchar', length: 20 })
  toUom: string;

  /** quantity(toUom) = quantity(fromUom) × conversionFactor */
  @Column({ name: 'conversion_factor', type: 'decimal', precision: 18, scale: 9 })
  conversionFactor: number;

  @Column({ name: 'conversion_type', type: 'varchar', length: 20, default: UomConversionType.EXACT })
  conversionType: UomConversionType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
