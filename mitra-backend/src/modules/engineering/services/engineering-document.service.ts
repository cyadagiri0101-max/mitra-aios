import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, Like } from 'typeorm';
import { EngineeringDocument, EngineeringDocType } from '../entities/engineering-document.entity';
import { EngineeringDocumentVersion } from '../entities/engineering-document-version.entity';
import { EngineeringEventBus } from './engineering-event-bus.service';
import { EngineeringDomainEventType } from '../events/engineering.events';
import { EngineeringAiHooksService } from './engineering-ai-hooks.service';
import { AuditService } from '../../audit/services/audit.service';

/**
 * Engineering Documents: versioned containers for CAD files, PDFs,
 * specifications, standards, calculations, images and simulation results.
 * Every upload appends a version — nothing is ever overwritten.
 */
@Injectable()
export class EngineeringDocumentService {
  constructor(
    @InjectRepository(EngineeringDocument)
    private readonly documentRepo: Repository<EngineeringDocument>,
    @InjectRepository(EngineeringDocumentVersion)
    private readonly versionRepo: Repository<EngineeringDocumentVersion>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly eventBus: EngineeringEventBus,
    private readonly aiHooks: EngineeringAiHooksService,
  ) {}

  private requireTenant(tenantId?: string | null): string {
    if (!tenantId || tenantId.trim() === '') {
      throw new ForbiddenException('Tenant context is required');
    }
    return tenantId;
  }

  async findAllAdvanced(tenantId?: string | null, query: Record<string, any> = {}) {
    const scopeTenant = this.requireTenant(tenantId);
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const qb = this.documentRepo.createQueryBuilder('d')
      .where('d.deleted_at IS NULL')
      .andWhere('d.tenant_id = :tenantId', { tenantId: scopeTenant });

    if (query.search) {
      qb.andWhere('(d.document_number ILIKE :search OR d.title ILIKE :search OR d.file_name ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    if (query.projectId) qb.andWhere('d.project_id = :projectId', { projectId: query.projectId });
    if (query.docType) qb.andWhere('d.doc_type = :docType', { docType: query.docType });
    if (query.status) qb.andWhere('d.status = :status', { status: query.status });

    const SORTABLE = new Set(['documentNumber', 'title', 'docType', 'currentVersion', 'createdAt', 'updatedAt']);
    const sortBy = query.sortBy ?? 'createdAt';
    const field = SORTABLE.has(sortBy) ? `d.${sortBy}` : 'd.created_at';
    const direction = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(field, direction).addOrderBy('d.created_at', 'DESC');

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const document = await this.documentRepo.findOne({ where: { id, deletedAt: IsNull(), tenantId: scopeTenant } });
    if (!document) throw new NotFoundException('Engineering document not found');
    return document;
  }

  async create(data: Record<string, any>, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    if (!data.projectId) throw new BadRequestException('projectId is required — no orphan engineering records');
    const document = this.documentRepo.create({
      ...data,
      documentNumber: await this.generateDocumentNumber(scopeTenant),
      docType: data.docType ?? EngineeringDocType.PDF,
      currentVersion: 1,
      status: 'DRAFT',
      createdBy: userId,
      updatedBy: userId,
      tenantId: scopeTenant,
    });
    const saved = await this.documentRepo.save(document);

    if (data.fileName) {
      await this.addVersion(saved.id, data, userId, scopeTenant);
    }

    await this.auditService.logBusinessEvent('engineering.document.created', 'EngineeringDocument', saved.id, userId ?? 'system', {
      documentNumber: saved.documentNumber,
      docType: saved.docType,
      projectId: saved.projectId,
      tenantId: saved.tenantId,
    });
    this.publish(saved, EngineeringDomainEventType.DOCUMENT_UPLOADED, { fileName: saved.fileName }, userId);
    return saved;
  }

  async update(id: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const document = await this.findOne(id, scopeTenant);
    Object.assign(document, data, { updatedBy: userId });
    const saved = await this.documentRepo.save(document);
    await this.auditService.logBusinessEvent('engineering.document.updated', 'EngineeringDocument', saved.id, userId ?? 'system', {
      changedFields: Object.keys(data),
      tenantId: saved.tenantId,
    });
    return saved;
  }

  async remove(id: string, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const document = await this.findOne(id, scopeTenant);
    await this.dataSource.transaction(async (em) => {
      const now = new Date();
      document.deletedAt = now;
      document.updatedBy = userId;
      await em.getRepository(EngineeringDocument).save(document);
      await em.getRepository(EngineeringDocumentVersion).update(
        { documentId: id, deletedAt: IsNull(), tenantId: scopeTenant },
        { deletedAt: now, updatedBy: userId },
      );
    });
    await this.auditService.logBusinessEvent('engineering.document.deleted', 'EngineeringDocument', id, userId ?? 'system', {
      documentNumber: document.documentNumber,
      tenantId: document.tenantId,
    });
    return { deleted: true, id };
  }

  // ── Versions ─────────────────────────────────────────────────────────────

  async listVersions(documentId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    await this.findOne(documentId, scopeTenant);
    return this.versionRepo.find({ where: { documentId, deletedAt: IsNull(), tenantId: scopeTenant }, order: { versionNumber: 'DESC' } });
  }

  /** Append a new immutable version to the document. */
  async addVersion(documentId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const document = await this.findOne(documentId, scopeTenant);
    if (!data.fileName) throw new BadRequestException('fileName is required to version a document');
    const last = await this.versionRepo.findOne({
      where: { documentId, deletedAt: IsNull(), tenantId: scopeTenant },
      order: { versionNumber: 'DESC' },
    });
    const versionNumber = (last?.versionNumber ?? 0) + 1;

    const version = this.versionRepo.create({
      documentId,
      versionNumber,
      fileName: data.fileName,
      filePath: data.filePath ?? null,
      mimeType: data.mimeType ?? null,
      fileSize: data.fileSize ?? 0,
      checksum: data.checksum ?? null,
      uploadedBy: userId,
      uploadedByName: data.uploadedByName ?? null,
      notes: data.notes ?? null,
      createdBy: userId,
      updatedBy: userId,
      tenantId: scopeTenant,
    });
    const saved = await this.versionRepo.save(version);

    document.currentVersion = versionNumber;
    document.fileName = data.fileName;
    document.mimeType = data.mimeType ?? document.mimeType;
    document.fileSize = data.fileSize ?? document.fileSize;
    document.updatedBy = userId;
    await this.documentRepo.save(document);

    await this.auditService.logBusinessEvent('engineering.document.versioned', 'EngineeringDocument', documentId, userId ?? 'system', {
      versionNumber,
      fileName: data.fileName,
      tenantId: document.tenantId,
    });
    this.publish(document, EngineeringDomainEventType.DOCUMENT_VERSIONED, { versionNumber, fileName: data.fileName }, userId);
    return saved;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async generateDocumentNumber(tenantId?: string | null): Promise<string> {
    const scopeTenant = this.requireTenant(tenantId);
    const year = new Date().getFullYear();
    const prefix = `EDOC-${year}-`;
    const count = await this.documentRepo.count({ where: { documentNumber: Like(`${prefix}%`), tenantId: scopeTenant } });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private publish(document: EngineeringDocument, eventType: EngineeringDomainEventType, payload: Record<string, any> = {}, actorId?: string | null) {
    const event = {
      eventType,
      occurredAt: new Date(),
      tenantId: document.tenantId,
      actorId: actorId ?? null,
      payload: {
        projectId: document.projectId,
        entityId: document.id,
        entityNumber: document.documentNumber,
        docType: document.docType,
        title: document.title,
        ...payload,
      },
    };
    this.eventBus.publish(event);
    this.aiHooks.dispatchEvent(event).catch(() => undefined);
  }
}
