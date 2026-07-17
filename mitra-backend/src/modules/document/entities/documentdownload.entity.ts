import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

@Entity('document_downloads')
@Index(['documentId', 'downloadedAt'])
export class DocumentDownload extends IndustrialBaseEntity {
  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ name: 'downloaded_by', type: 'uuid', nullable: true })
  downloadedBy: string | null;

  @Column({ name: 'downloaded_at', type: 'timestamptz' })
  downloadedAt: Date;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'download_reason', type: 'varchar', length: 100, nullable: true })
  downloadReason: string | null;
}