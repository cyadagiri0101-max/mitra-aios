import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ReservationStatus { RESERVED='RESERVED', PARTIALLY_ISSUED='PARTIALLY_ISSUED', ISSUED='ISSUED', RELEASED='RELEASED', CANCELLED='CANCELLED' }

/**
 * Sprint 2.4 MES — material reservation against released BOM items
 * (Phase 6). planned → reserved → issued progression with shortage and
 * variance detection.
 */
@Entity('material_reservations')
@Index(['workOrderId', 'deletedAt'])
@Index(['bomItemId', 'deletedAt'])
export class MaterialReservation extends IndustrialBaseEntity {
  @Column({ name: 'reservation_number', type: 'varchar', length: 30, unique: true })
  reservationNumber: string;

  @Column({ name: 'work_order_id', type: 'uuid' })
  @Index()
  workOrderId: string;

  @Column({ name: 'bom_item_id', type: 'uuid', nullable: true })
  bomItemId: string | null;

  @Column({ name: 'part_number', type: 'varchar', length: 100, nullable: true })
  partNumber: string | null;

  @Column({ name: 'part_name', type: 'varchar', length: 200, nullable: true })
  partName: string | null;

  @Column({ name: 'uom', type: 'varchar', length: 20, default: 'KG' })
  uom: string;

  @Column({ name: 'planned_qty', type: 'decimal', precision: 10, scale: 3, default: 0 })
  plannedQty: number;

  @Column({ name: 'reserved_qty', type: 'decimal', precision: 10, scale: 3, default: 0 })
  reservedQty: number;

  @Column({ name: 'issued_qty', type: 'decimal', precision: 10, scale: 3, default: 0 })
  issuedQty: number;

  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.RESERVED })
  status: ReservationStatus;

  @Column({ name: 'batch_id', type: 'uuid', nullable: true })
  batchId: string | null;

  @Column({ name: 'store_location', type: 'varchar', length: 50, nullable: true })
  storeLocation: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;
}
