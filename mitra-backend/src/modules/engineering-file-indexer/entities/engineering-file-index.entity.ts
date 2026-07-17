import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('engineering_file_index')
@Index(['tenantId', 'deletedAt'])
@Index(['toolNo', 'deletedAt'])
@Index(['toolNo', 'relativePath', 'deletedAt'])
export class EngineeringFileIndex extends IndustrialBaseEntity {
  @Column({ name: 'tool_no', type: 'varchar', length: 50 })
  toolNo: string;

  @Column({ name: 'item_type', type: 'varchar', length: 20, default: 'file' })
  itemType: 'folder' | 'file';

  @Column({ name: 'folder_name', type: 'varchar', length: 255 })
  folderName: string;

  @Column({ name: 'folder_path', type: 'varchar', length: 1000 })
  folderPath: string;

  @Column({ name: 'relative_path', type: 'varchar', length: 2000 })
  relativePath: string;

  @Column({ name: 'parent_relative_path', type: 'varchar', length: 2000, nullable: true })
  parentRelativePath: string | null;

  @Column({ name: 'unc_path', type: 'varchar', length: 4000, unique: true })
  uncPath: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'extension', type: 'varchar', length: 50, nullable: true })
  extension: string | null;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: number;

  @Column({ name: 'last_modified_at', type: 'timestamptz' })
  lastModifiedAt: Date;
}
