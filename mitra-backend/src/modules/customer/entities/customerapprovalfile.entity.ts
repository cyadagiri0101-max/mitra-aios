import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('customer_approval_files')
@Index(['approvalId', 'deletedAt'])
export class CustomerApprovalFile extends IndustrialBaseEntity {
  @Column({ name: 'approval_id', type: 'uuid' })
  approvalId: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  @Column({ name: 'file_type', type: 'varchar', length: 50, nullable: true })
  fileType: string | null;

  @Column({ name: 'minio_bucket', type: 'varchar', length: 100 })
  minioBucket: string;

  @Column({ name: 'minio_key', type: 'varchar', length: 500 })
  minioKey: string;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes: number | null;

  @Column({ name: 'is_customer_provided', type: 'boolean', default: false })
  isCustomerProvided: boolean;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy: string | null;
}