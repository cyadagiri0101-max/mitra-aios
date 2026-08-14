import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ProjectFolder } from '../entities/projectfolder.entity';
import { ProjectDocument, ProjectDocumentStatus } from '../entities/projectdocument.entity';
import { ProjectDocumentVersion } from '../entities/projectdocumentversion.entity';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';
import { DomainEventBus } from './domain-event-bus.service';
import { ProjectDomainEventType } from '../events/project.events';
import { MinioService } from '../../storage/minio.service';

export interface StoredFile {
  fileName: string;
  filePath: string;
  mimeType?: string | null;
  fileSize?: number;
  /** Content SHA-256, computed by the storage layer (MinIO) — integrity anchor. */
  checksum?: string | null;
}

/**
 * Project Document Center: folder structure + versioned documents.
 * Every upload creates a new immutable version; the document row tracks
 * the current version and release status. Physical files live in MinIO
 * (`mitra-documents` bucket); the DB stores the object key + content hash.
 */
@Injectable()
export class ProjectDocumentService {
  constructor(
    @InjectRepository(ProjectFolder) private readonly folderRepo: Repository<ProjectFolder>,
    @InjectRepository(ProjectDocument) private readonly documentRepo: Repository<ProjectDocument>,
    @InjectRepository(ProjectDocumentVersion) private readonly versionRepo: Repository<ProjectDocumentVersion>,
    @InjectRepository(ProjectActivityLog) private readonly activityRepo: Repository<ProjectActivityLog>,
    private readonly minio: MinioService,
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
    let parentPath = '';
    if (data.parentFolderId) {
      const whereParent: any = { id: data.parentFolderId, projectId, deletedAt: IsNull() };
      if (tenantId) whereParent.tenantId = tenantId;
      const parent = await this.folderRepo.findOne({ where: whereParent });
      if (!parent) throw new BadRequestException('Parent folder does not exist in this project');
      parentPath = parent.folderPath;
    }
    const name = String(data.folderName).trim();
    const existing = await this.folderRepo.findOne({
      where: { projectId, folderPath: `${parentPath}/${name}`, deletedAt: IsNull() },
    });
    if (existing) throw new BadRequestException(`A folder named "${name}" already exists here`);
    const folder = this.folderRepo.create({
      projectId,
      folderName: name,
      folderPath: `${parentPath}/${name}`,
      folderType: 'CUSTOM',
      parentFolderId: data.parentFolderId ?? null,
      sequence: data.sequence ?? 0,
      isDefault: false,
      createdBy: userId,
      updatedBy: userId,
      tenantId: tenantId ?? undefined,
    });
    const saved = await this.folderRepo.save(folder);
    await this.logActivity(
      { projectId, tenantId: tenantId ?? undefined } as ProjectDocument,
      'document.folder_created',
      `Folder created: ${saved.folderName}`,
      userId,
      tenantId,
    );
    return saved;
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

  /** Fail-closed tenant guard - mirrors TenantAwareService.requireTenant. */
  private requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for tenant-scoped operation');
    }
    return tenantId;
  }

  async findOne(id: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const document = await this.documentRepo.findOne({
      where: { id, tenantId: scopeTenant, deletedAt: IsNull() },
      relations: ['versions'],
    });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  /**
   * Register a document with its first version (v1). The physical file
   * location is provided by the caller (storage layer / MinIO upload);
   * `file.checksum` is the content SHA-256 and is stored as the integrity
   * anchor — the filePath is NEVER hashed (path strings are not content).
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

    const scopeTenant = this.requireTenant(tenantId);
    const checksum = file.checksum ?? null;

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
      tenantId: scopeTenant,
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
        tenantId: scopeTenant,
      }),
    );

    await this.logActivity(saved, 'document.uploaded', `Document uploaded: ${saved.title} (v1)`, userId, tenantId);
    this.eventBus.publish({
      eventType: ProjectDomainEventType.DOCUMENT_UPLOADED,
      occurredAt: new Date(),
      projectId,
      tenantId: scopeTenant,
      actorId: userId ?? null,
      payload: { documentId: saved.id, title: saved.title, version: 1 },
    });
    return this.findOne(saved.id, scopeTenant);
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
   * advances and the document's file metadata is updated. Uploading onto a
   * RELEASED document opens a new review cycle (back to DRAFT).
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
    const previousStatus = document.status;

    const checksum = file.checksum ?? null;
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
    if (document.status !== ProjectDocumentStatus.DRAFT) {
      document.status = ProjectDocumentStatus.DRAFT;
    }
    document.updatedBy = userId;
    const saved = await this.documentRepo.save(document);

    await this.logActivity(saved, 'document.uploaded', `Document version ${nextVersion}: ${saved.title}`, userId, tenantId, {
      previousStatus,
      checksum,
    });
    return this.findOne(saved.id, tenantId);
  }

  /** Release a document (final approval of current version). */
  async release(id: string, remarks: string | null, userId: string, tenantId?: string | null) {
    const document = await this.findOne(id, tenantId);
    if (document.status === ProjectDocumentStatus.ARCHIVED) {
      throw new BadRequestException('Archived documents cannot be released');
    }
    if (document.status === ProjectDocumentStatus.RELEASED) {
      throw new BadRequestException(`Document is already released (v${document.currentVersion})`);
    }
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
    const scopeTenant = this.requireTenant(tenantId);
    return this.versionRepo.find({
      where: { documentId, tenantId: scopeTenant, deletedAt: IsNull() },
      order: { versionNumber: 'DESC' } as any,
      take: 200,
    });
  }

  /**
   * Resolve a download link for a specific version (defaults to the current
   * version). Physical files live in MinIO; the version's stored object key
   * is signed for a limited window (1 day).
   */
  async download(id: string, versionNumber?: number, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const document = await this.findOne(id, scopeTenant);
    const where: any = { documentId: id, tenantId: scopeTenant, deletedAt: IsNull() };
    if (versionNumber) where.versionNumber = versionNumber;
    const version = await this.versionRepo.findOne({
      where,
      order: { versionNumber: 'DESC' } as any,
    });
    if (!version) throw new NotFoundException(`Version ${versionNumber ?? document.currentVersion} not found for this document`);

    const presigned = await this.minio.generatePresignedGetUrl(
      this.minio.getDefaultBucket(),
      version.filePath,
      86400,
    );
    return {
      documentId: id,
      versionNumber: version.versionNumber,
      fileName: version.fileName,
      mimeType: version.mimeType,
      sizeBytes: version.fileSize,
      checksumSha256: version.checksum ?? null,
      url: presigned.url,
      expiresInSeconds: 86400,
    };
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
