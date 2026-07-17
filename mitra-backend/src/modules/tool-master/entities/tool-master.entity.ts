import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('tool_master')
@Index(['tenantId', 'deletedAt'])
@Index(['toolNo', 'deletedAt'], { unique: true })
export class ToolMaster extends IndustrialBaseEntity {
  @Column({ name: 'tool_no', type: 'varchar', length: 50, unique: true })
  toolNo: string;

  @Column({ name: 'tool_type', type: 'varchar', length: 20 })
  toolType: string;

  @Column({ name: 'project_name', type: 'varchar', length: 200, nullable: true })
  projectName: string | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 200, nullable: true })
  customerName: string | null;

  @Column({ name: 'product_name', type: 'varchar', length: 200, nullable: true })
  productName: string | null;

  @Column({ name: 'project_number', type: 'varchar', length: 50, nullable: true })
  projectNumber: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  capacity: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  material: string | null;
  @Column({ type: 'varchar', length: 50, nullable: true })
  neckType: string | null;
  @Column({ type: 'varchar', length: 50, nullable: true })
  machine: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cavity: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  status: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  revision: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
