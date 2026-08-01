import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ProjectFolder } from '../entities/projectfolder.entity';
import { ProjectDocument, ProjectDocumentStatus } from '../entities/projectdocument.entity';
import { ProjectDocumentVersion } from '../entities/projectdocumentversion.entity';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';
import { DomainEventBus } from './domain-event-bus.service';
import { ProjectDomainEventType } from '../events/project.events';
import * as crypto from 'crypto';

export interface StoredFile {
  fileName: string;
  filePath: string;
  mimeType?: string | null;
  fileSize?: number;
}

/**
 * Project Document Center: folder structure + versioned documents.
 * Every upload creates a new immutable version; the document row tracks
 * the current version and release status.
 */
@Injectable()
export class ProjectDocumentService {
  constructor(
    @InjectRepository(ProjectFolder) private readonly folderRepo: Repository<ProjectFolder>,
    @InjectRepository(ProjectDocument) private readonly documentRepo: Repository<ProjectDocument>,
    @InjectRepository(ProjectDocumentVersion) private readonly versionRepo: Repository<ProjectDocumentVersion>,
    @InjectRepository(ProjectActivityLog) private readonly activityRepo: Repository<ProjectActivityLog>,
    private readonly eventBus: DomainEventBus,
  ) {}

  // ── Folders ────────────────────────────────────────────────────────────────

  async findFolders(projectId: string, tenantId?: string | null) {
    const where: any = { projectId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const folders = await this.folderRepo.find({ where, order: { sequence: 'ASC' } as any, take: 500 });
    const counts = await this.documentRepo
      .createQueryBuilder('d')
      .select('d.folder_id', 'folderId')
      .addSelect('COUNT(*)', 'count')
      .where('d.project_id = :projectId', { projectId })
      .andWhere('d.deleted_at IS NULL')
      .groupBy('d.folder_id')
      .getRawMany();
    const countMap = new Map(counts.map((c) => [c.folderId, Number(c.count)]));
    return folders.map((f) => ({ ...f, documentCount: countMap.get(f.id) ?? 0 }));
  }

  async createFolder(projectId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const parentPath = '';
    const folder = this.folderRepo.create({
      projectId,
      folderName: data.folderName,
      folderPath: `${parentPath}/${data.folderName}`,
      sequence: data.sequence ?? 0,
      isDefault: false,
      createdBy: userId,
      updatedBy: userId,
      tenantId: tenantId ?? undefined,
    });
    return this.folderRepo.save(folder);
  }

  async removeFolder(id: string, userId: string, tenantId?: string | null) {
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const folder = await this.folderRepo.findOne({ where });
    if (!folder) throw new NotFoundException('Folder not found');
    const docCount = await this.documentRepo.count({ where: { folderId: id, deletedAt: IsNull() } });
    if (docCount > 0) throw new BadRequestException('Folder is not empty — move or delete documents first');
    folder.deletedAt = new Date();
    folder.updatedBy = userId;
    return this.folderRepo.save(folder);
  }

  // ── Documents ──────────────────────────────────────────────────────────────

  async findByProject(projectId: string, query: Record<string, any> = {}, tenantId?: string | null) {
    const qb = this.documentRepo.createQueryBuilder('d')
      .where('d.project_id = :projectId', { projectId })
      .andWhere('d.deleted_at IS NULL');
    if (tenantId) qb.andWhere('d.tenant_id = :tenantId', { tenantId });
    if (query.documentType) qb.andWhere('d.document_type = :documentType', { documentType: query.documentType });
    if (query.status) qb.andWhere('d.status = :status', { status: query.status });
    if (query.folderId) qb.andWhere('d.folder_id = :folderId', { folderId: query.folderId });
    if (query.search) {
      qb.andWhere('(d.title ILIKE :search OR d.file_name ILIKE :search)', { search: `%${query.search}%` });
    }
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    qb.orderBy('d.updated_at', 'DESC');
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId?: string | null) {
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const document = await this.documentRepo.findOne({ where, relations: ['versions'] });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  /**
   * Register a document with its first version (v1). The physical file
   * location is provided by the caller (storage layer / multer).
   */
  async create(
    projectId: string,
    data: Record<string, any>,
    file: StoredFile,
    userId: string,
    userName: string | null,
    tenantId?: string | null,
  ) {
    if (data.folderId) {
      const folder = await this.folderRepo.findOne({ where: { id: data.folderId, projectId, deletedAt: IsNull() } });
      if (!folder) throw new BadRequestException('Folder not found for this project');
    }

    const checksum = crypto.createHash('sha256').update(file.filePath).digest('hex').slice(0, 64);

    const document = this.documentRepo.create({
      projectId,
      folderId: data.folderId ?? null,
      documentType: data.documentType ?? 'OTHER',
      title: data.title,
      description: data.description ?? null,
      fileName: file.fileName,
      mimeType: file.mimeType ?? null,
      fileSize: file.fileSize ?? 0,
      currentVersion: 1,
      status: ProjectDocumentStatus.DRAFT,
      isLatest: true,
      createdBy: userId,
      updatedBy: userId,
      tenantId: tenantId ?? undefined,
    });
    const saved = await this.documentRepo.save(document);

    await this.versionRepo.save(
      this.versionRepo.create({
        documentId: saved.id,
        versionNumber: 1,
        fileName: file.fileName,
        filePath: file.filePath,
        mimeType: file.mimeType ?? null,
        fileSize: file.fileSize ?? 0,
        uploadedBy: userId ?? null,
        notes: data.notes ?? null,
        checksum,
        createdBy: userId,
        updatedBy: userId,
        tenantId: tenantId ?? undefined,
      }),
    );

    await this.logActivity(saved, 'document.uploaded', `Document uploaded: ${saved.title} (v1)`, userId, tenantId);
    this.eventBus.publish({
      eventType: ProjectDomainEventType.DOCUMENT_UPLOADED,
      occurredAt: new Date(),
      projectId,
      tenantId: tenantId ?? null,
      actorId: userId ?? null,
      payload: { documentId: saved.id, title: saved.title, version: 1 },
    });
    return this.findOne(saved.id, tenantId);
  }

  /** Metadata-only update (title, description, type, folder). */
  async update(id: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const document = await this.findOne(id, tenantId);
    if (data.folderId) {
      const folder = await this.folderRepo.findOne({
        where: { id: data.folderId, projectId: document.projectId, deletedAt: IsNull() },
      });
      if (!folder) throw new BadRequestException('Folder not found for this project');
    }
    Object.assign(document, data, { updatedBy: userId });
    return this.documentRepo.save(document);
  }

  /**
   * Upload a new version of an existing document. Immutable versioning:
   * the previous current version stays untouched; document.currentVersion
   * advances and the document's file metadata is updated.
   */
  async uploadVersion(
    id: string,
    file: StoredFile,
    userId: string,
    notes: string | null,
    tenantId?: string | null,
  ) {
    const document = await this.findOne(id, tenantId);
    const nextVersion = document.currentVersion + 1;

    const checksum = crypto.createHash('sha256').update(file.filePath).digest('hex').slice(0, 64);
    await this.versionRepo.save(
      this.versionRepo.create({
        documentId: document.id,
        versionNumber: nextVersion,
        fileName: file.fileName,
        filePath: file.filePath,
        mimeType: file.mimeType ?? null,
        fileSize: file.fileSize ?? 0,
        uploadedBy: userId ?? null,
        notes,
        checksum,
        createdBy: userId,
        updatedBy: userId,
        tenantId: tenantId ?? undefined,
      }),
    );

    document.currentVersion = nextVersion;
    document.fileName = file.fileName;
    document.mimeType = file.mimeType ?? document.mimeType;
    document.fileSize = file.fileSize ?? document.fileSize;
    if (document.status === ProjectDocumentStatus.SUPERSEDED) {
      document.status = ProjectDocumentStatus.DRAFT;
    }
    document.updatedBy = userId;
    const saved = await this.documentRepo.save(document);

    await this.logActivity(saved, 'document.uploaded', `Document version ${nextVersion}: ${saved.title}`, userId, tenantId);
    return this.findOne(saved.id, tenantId);
  }

  /** Release a document (final approval of current version). */
  async release(id: string, remarks: string | null, userId: string, tenantId?: string | null) {
    const document = await this.findOne(id, tenantId);
    document.status = ProjectDocumentStatus.RELEASED;
    document.releasedBy = userId ?? null;
    document.releasedAt = new Date();
    document.updatedBy = userId;
    const saved = await this.documentRepo.save(document);

    await this.logActivity(saved, 'document.released', `Document released: ${saved.title} (v${saved.currentVersion})`, userId, tenantId, {
      remarks,
    });
    this.eventBus.publish({
      eventType: ProjectDomainEventType.DOCUMENT_RELEASED,
      occurredAt: new Date(),
      projectId: saved.projectId,
      tenantId: tenantId ?? null,
      actorId: userId ?? null,
      payload: { documentId: saved.id, title: saved.title, version: saved.currentVersion },
    });
    return saved;
  }

  /** Soft-archive a document. */
  async archive(id: string, userId: string, tenantId?: string | null) {
    const document = await this.findOne(id, tenantId);
    document.status = ProjectDocumentStatus.ARCHIVED;
    document.updatedBy = userId;
    const saved = await this.documentRepo.save(document);
    await this.logActivity(saved, 'document.archived', `Document archived: ${saved.title}`, userId, tenantId);
    return saved;
  }

  async versions(documentId: string, tenantId?: string | null) {
    const where: any = { documentId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    return this.versionRepo.find({ where, order: { versionNumber: 'DESC' } as any, take: 200 });
  }

  async remove(id: string, userId: string, tenantId?: string | null) {
    const document = await this.findOne(id, tenantId);
    document.deletedAt = new Date();
    document.updatedBy = userId;
    const saved = await this.documentRepo.save(document);
    await this.logActivity(saved, 'document.deleted', `Document deleted: ${saved.title}`, userId, tenantId);
    return { deleted: true, id };
  }

  private async logActivity(
    document: ProjectDocument,
    type: string,
    title: string,
    userId: string,
    tenantId: string | null | undefined,
    metadata?: Record<string, any>,
  ) {
    await this.activityRepo.save(
      this.activityRepo.create({
        projectId: document.projectId,
        activityType: type,
        title,
        actorId: userId ?? null,
        tenantId: tenantId ?? undefined,
        metadata: metadata ?? null,
      }),
    );
  }
}
