import { Column, Entity } from 'typeorm';
import { BaseEntityWithDates } from './base-entity';

@Entity({ name: 'folder_template_master' })
export class FolderTemplateMaster extends BaseEntityWithDates {
  @Column({ unique: true })
  templateName!: string;

  @Column('text')
  folderPattern!: string;

  @Column({ nullable: true })
  sourceFile!: string | null;
}
