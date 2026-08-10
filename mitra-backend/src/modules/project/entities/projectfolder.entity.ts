import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

/**
 * Default folder structure of a project (Drawings, RFQs, Quotations,
 * Meeting Notes, Contracts, Images, Trial Reports).
 */
@Entity('project_folders')
@Index(['projectId', 'deletedAt'])
export class ProjectFolder extends IndustrialBaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'parent_folder_id', type: 'uuid', nullable: true })
  parentFolderId: string | null;

  @Column({ name: 'folder_name', type: 'varchar', length: 200 })
  folderName: string;

  @Column({ name: 'folder_path', type: 'varchar', length: 500 })
  folderPath: string;

  @Column({ name: 'folder_type', type: 'varchar', length: 50, default: 'DEFAULT' })
  folderType: string;

  @Column({ name: 'sequence', type: 'int', default: 0 })
  sequence: number;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;
}
