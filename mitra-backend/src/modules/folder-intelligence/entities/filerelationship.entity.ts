import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('file_relationships')
@Index(['sourceFileId', 'deletedAt'])
export class FileRelationship extends IndustrialBaseEntity {
  @Column({ name: 'source_file_id', type: 'uuid' })
  sourceFileId: string;

  @Column({ name: 'target_file_id', type: 'uuid' })
  @Index()
  targetFileId: string;

  @Column({ name: 'relationship_type', type: 'varchar', length: 50 })
  relationshipType: string;

  @Column({ name: 'source_entity_type', type: 'varchar', length: 50, nullable: true })
  sourceEntityType: string | null;

  @Column({ name: 'detected_automatically', type: 'boolean', default: false })
  detectedAutomatically: boolean;

  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidenceScore: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}