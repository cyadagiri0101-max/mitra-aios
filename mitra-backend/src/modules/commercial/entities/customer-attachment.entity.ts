import { Entity, Column, VersionColumn, Index, ManyToOne, JoinColumn  } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { Customer } from './customer.entity';

@Entity('customer_attachments')
@Index(['customerId', 'deletedAt'])
export class CustomerAttachment extends IndustrialBaseEntity {
  @Column({ name: 'customer_id', type: 'uuid' })
  @Index()
  customerId: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'file_type', type: 'varchar', length: 100, nullable: true })
  fileType: string | null;

  @Column({ name: 'file_key', type: 'varchar', length: 500 })
  fileKey: string;

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl: string | null;

  @Column({ name: 'size_bytes', type: 'bigint', nullable: true })
  sizeBytes: string | null;

  @Column({ name: 'checksum_sha256', type: 'varchar', length: 64, nullable: true })
  checksumSha256: string | null;

  @Column({ type: 'varchar', length: 100, default: 'mitra-customer' })
  bucket: string;

  @VersionColumn()
  version: number;

  @ManyToOne(() => Customer, (customer) => customer.attachments)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
