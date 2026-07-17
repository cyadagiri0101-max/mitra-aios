import {
  Entity, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { BomAnalysis } from './bom-analysis.entity';

@Entity('bom_items')
export class BomItem extends IndustrialBaseEntity {
  @Column({ name: 'analysis_id', type: 'uuid' })
  analysisId: string;

  @Column({ name: 'part_number', type: 'varchar', length: 100 })
  partNumber: string;

  @Column({ type: 'int', nullable: true })
  quantity: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  material: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  vendor: string | null;

  @Column({ name: 'lead_time', type: 'int', nullable: true })
  leadTime: number | null;

  @Column({ name: 'risk_level', type: 'varchar', length: 20, nullable: true })
  riskLevel: string | null;

  @Column({ name: 'substitute_suggestions', type: 'jsonb', nullable: true })
  substituteSuggestions: Record<string, any>[] | null;

  @ManyToOne(() => BomAnalysis, (analysis) => analysis.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'analysis_id' })
  analysis: BomAnalysis;
}
