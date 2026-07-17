import {
  Entity, Column, OneToMany,
} from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { BomItem } from './bom-item.entity';

@Entity('bom_analyses')
export class BomAnalysis extends IndustrialBaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'bom_data', type: 'jsonb' })
  bomData: Record<string, any>;

  @Column({ name: 'complexity_score', type: 'decimal', precision: 4, scale: 2, nullable: true })
  complexityScore: number | null;

  @Column({ name: 'risk_areas', type: 'jsonb', nullable: true })
  riskAreas: Record<string, any>[] | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidence: number | null;

  @OneToMany(() => BomItem, (item) => item.analysis, { cascade: true })
  items: BomItem[];
}
