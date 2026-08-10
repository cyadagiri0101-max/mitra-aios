import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('tool_master')
@Index(['tenantId', 'deletedAt'])
@Index(['toolNo', 'deletedAt'], { unique: true })
export class ToolMaster extends IndustrialBaseEntity {
  @Column({ name: 'tool_number', type: 'varchar', length: 30, unique: true })
  toolNo: string;

  @Column({ name: 'tool_type', type: 'varchar', length: 30, nullable: true })
  toolType: string | null;

  @Column({ name: 'legacy_tool_number', type: 'varchar', length: 50, nullable: true })
  legacyToolNumber: string | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 200, nullable: true })
  customerName: string | null;

  @Column({ name: 'machine', type: 'varchar', length: 100, nullable: true })
  machine: string | null;

  @Column({ name: 'cavity', type: 'varchar', length: 50, nullable: true })
  cavity: string | null;

  @Column({ name: 'volume', type: 'varchar', length: 50, nullable: true })
  volume: string | null;

  @Column({ name: 'neck_type', type: 'varchar', length: 50, nullable: true })
  neckType: string | null;

  @Column({ name: 'neck_material', type: 'varchar', length: 100, nullable: true })
  neckMaterial: string | null;

  @Column({ name: 'body_material', type: 'varchar', length: 100, nullable: true })
  bodyMaterial: string | null;

  @Column({ name: 'base_material', type: 'varchar', length: 100, nullable: true })
  baseMaterial: string | null;

  @Column({ name: 'status', type: 'varchar', length: 50, nullable: true })
  status: string | null;

  @Column({ name: 'dispatch_date', type: 'date', nullable: true })
  dispatchDate: Date | null;

  @Column({ name: 'source_file', type: 'varchar', length: 255, nullable: true })
  sourceFile: string | null;

  @Column({ name: 'source_sheet', type: 'varchar', length: 100, nullable: true })
  sourceSheet: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ name: 'project_number', type: 'varchar', length: 50, nullable: true })
  projectNumber: string | null;

  @Column({ name: 'capacity', type: 'varchar', length: 50, nullable: true })
  capacity: string | null;

  @Column({ name: 'material', type: 'varchar', length: 50, nullable: true })
  material: string | null;

  @Column({ name: 'project_name', type: 'varchar', length: 200, nullable: true })
  projectName: string | null;

  @Column({ name: 'product_name', type: 'varchar', length: 200, nullable: true })
  productName: string | null;

  @Column({ name: 'revision', type: 'varchar', length: 20, nullable: true })
  revision: string | null;
}
