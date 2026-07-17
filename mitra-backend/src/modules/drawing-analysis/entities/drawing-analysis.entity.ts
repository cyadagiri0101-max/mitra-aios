import {
  Entity, Column,
} from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum DrawingFileType {
  STEP = 'STEP',
  IGES = 'IGES',
  PDF = 'PDF',
  DWG = 'DWG',
}

@Entity('drawing_analyses')
export class DrawingAnalysis extends IndustrialBaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'file_type', type: 'enum', enum: DrawingFileType })
  fileType: DrawingFileType;

  @Column({ name: 'file_url', type: 'varchar', length: 512 })
  fileUrl: string;

  @Column({ name: 'part_complexity', type: 'varchar', length: 20, nullable: true })
  partComplexity: string | null;

  @Column({ name: 'suggested_machining_time', type: 'decimal', precision: 8, scale: 2, nullable: true })
  suggestedMachiningTime: number | null;

  @Column({ name: 'risk_areas', type: 'jsonb', nullable: true })
  riskAreas: Record<string, any>[] | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidence: number | null;

  @Column({ name: 'extracted_features', type: 'jsonb', nullable: true })
  extractedFeatures: Record<string, any>[] | null;
}
