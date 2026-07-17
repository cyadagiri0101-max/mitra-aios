import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum MatchType { EXTENSION='EXTENSION', FILENAME_PATTERN='FILENAME_PATTERN', CONTENT_SIGNATURE='CONTENT_SIGNATURE', FOLDER_PATH='FOLDER_PATH' }

@Entity('file_classification_rules')
export class FileClassificationRule extends IndustrialBaseEntity {
  @Column({ name: 'rule_name', type: 'varchar', length: 100 })
  ruleName: string;

  @Column({ name: 'match_type', type: 'enum', enum: MatchType, default: MatchType.EXTENSION })
  matchType: MatchType;

  @Column({ name: 'match_pattern', type: 'varchar', length: 255 })
  matchPattern: string;

  @Column({ name: 'detected_type', type: 'varchar', length: 50 })
  detectedType: string;

  @Column({ name: 'target_folder_type', type: 'varchar', length: 50, nullable: true })
  targetFolderType: string | null;

  @Column({ name: 'priority', type: 'int', default: 5 })
  priority: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}