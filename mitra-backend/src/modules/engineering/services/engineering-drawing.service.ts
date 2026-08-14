import {
  Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, Like } from 'typeorm';
import { EngineeringDrawing } from '../entities/engineering-drawing.entity';
import { EngineeringDrawingRevision, DrawingRevisionStatus } from '../entities/engineering-drawing-revision.entity';
import { EngineeringEventBus } from './engineering-event-bus.service';
import { EngineeringDomainEventType } from '../events/engineering.events';
import { EngineeringAiHooksService } from './engineering-ai-hooks.service';
import { AuditService } from '../../audit/services/audit.service';
import { WorkflowService } from '../../workflow/services/workflow.service';

export const DRAWING_WORKFLOW_TYPE = 'engineering_drawing';

/**
 * Drawing Management: drawing master, versioned revisions, check-in /
 * check-out control, approval (DB-driven workflow) and CAD metadata.
 */
@Injectable()
export class EngineeringDrawingService {
  constructor(
    @InjectRepository(EngineeringDrawing)
    private readonly drawingRepo: Repository<EngineeringDrawing>,
    @InjectRepository(EngineeringDrawingRevision)
    private readonly revisionRepo: Repository<EngineeringDrawingRevision>,
    private readonly dataSource: DataSource,
    private readonly workflowService: WorkflowService,
    private readonly auditService: AuditService,
    private readonly eventBus: EngineeringEventBus,
    private readonly aiHooks: EngineeringAiHooksService,
  ) {}

  /** Fail-closed guard — tenant context is mandatory for tenant-scoped data. */
  private requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for tenant-scoped operation');
    }
    return tenantId;
  }

  async findAllAdvanced(tenantId?: string | null, query: Record<string, any> = {}) {
    const scopeTenant = this.requireTenant(tenantId);
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const qb = this.drawingRepo.createQueryBuilder('d').where('d.deleted_at IS NULL');
    qb.andWhere('d.tenant_id = :tenantId', { tenantId: scopeTenant });
    if (query.search) {
      qb.andWhere(
        '(d.drawing_number ILIKE :search OR d.title ILIKE :search OR d.part_number ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.projectId) qb.andWhere('d.project_id = :projectId', { projectId: query.projectId });
    if (query.drawingType) qb.andWhere('d.drawing_type = :drawingType', { drawingType: query.drawingType });
    if (query.status) qb.andWhere('d.status = :status', { status: query.status });
    if (query.currentRevision) qb.andWhere('d.current_revision = :currentRevision', { currentRevision: query.currentRevision });

    const SORTABLE = new Set(['drawingNumber', 'title', 'createdAt', 'currentRevision', 'status', 'updatedAt']);
    const sortBy = query.sortBy ?? 'createdAt';
    const field = SORTABLE.has(sortBy) ? `d.${sortBy}` : 'd.created_at';
    const direction = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(field, direction).addOrderBy('d.created_at', 'DESC');

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId?: string | null) {
    const where: any = { id, deletedAt: IsNull(), tenantId: this.requireTenant(tenantId) };
    const drawing = await this.drawingRepo.findOne({ where });
    if (!drawing) throw new NotFoundException('Engineering drawing not found');
    return drawing;
  }

  async create(data: Record<string, any>, userId: string, tenantId?: string | null) {
    if (!data.projectId) throw new BadRequestException('projectId is required — no orphan engineering records');
    const scopeTenant = this.requireTenant(tenantId);

    let saved: EngineeringDrawing | undefined;
    let lastErr: any;
    for (let attempt = 0; attempt < 5; attempt++) {
      const drawingNumber = await this.generateDrawingNumber(scopeTenant, attempt);
      const drawing = this.drawingRepo.create({
        ...data,
        drawingNumber,
        currentRevision: data.currentRevision ?? 'A',
        status: 'DRAFT',
        checkedOutBy: null,
        checkedOutAt: null,
        createdBy: userId,
        updatedBy: userId,
        tenantId: scopeTenant,
      });
      try {
        saved = await this.drawingRepo.save(drawing);
        break;
      } catch (err: any) {
        if (err?.code !== '23505') throw err;
        lastErr = err;
      }
    }
    if (!saved) throw lastErr;

    // DB-driven workflow instance (engineering_drawing)
    try {
      const instance = await this.workflowService.createInstance(DRAWING_WORKFLOW_TYPE, 'drawing', saved.id, {
        userId, userRole: [], userPermissions: [], tenantId: scopeTenant,
      });
      saved.workflowInstanceId = instance.id;
      await this.drawingRepo.save(saved);
    } catch { /* workflow states not seeded yet */ }

    this.auditService.logBusinessEvent('engineering.drawing.created', 'EngineeringDrawing', saved.id, userId ?? 'system', {
      drawingNumber: saved.drawingNumber,
      title: saved.title,
      projectId: saved.projectId,
      tenantId: saved.tenantId,
    });
    this.publish({
      eventType: EngineeringDomainEventType.DRAWING_CREATED,
      occurredAt: new Date(),
      drawing: saved,
      actorId: userId,
    });

    return saved;
  }

  async update(id: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const drawing = await this.findOne(id, tenantId);
    Object.assign(drawing, data, { updatedBy: userId });
    const saved = await this.drawingRepo.save(drawing);
    this.auditService.logBusinessEvent('engineering.drawing.updated', 'EngineeringDrawing', saved.id, userId ?? 'system', {
      changedFields: Object.keys(data),
      tenantId: saved.tenantId,
    });
    return saved;
  }

  /** Soft-delete the drawing and ALL its revisions in one transaction. */
  async remove(id: string, userId: string, tenantId?: string | null) {
    const drawing = await this.findOne(id, tenantId);
    await this.dataSource.transaction(async (em) => {
      const now = new Date();
      drawing.deletedAt = now;
      drawing.updatedBy = userId;
      await em.getRepository(EngineeringDrawing).save(drawing);
      await em.getRepository(EngineeringDrawingRevision).update(
        { drawingId: id, deletedAt: IsNull() },
        { deletedAt: now, updatedBy: userId },
      );
    });
    this.auditService.logBusinessEvent('engineering.drawing.deleted', 'EngineeringDrawing', id, userId ?? 'system', {
      drawingNumber: drawing.drawingNumber,
      tenantId: drawing.tenantId,
    });
    return { deleted: true, id };
  }

  // ── Revisions ────────────────────────────────────────────────────────────

  async listRevisions(drawingId: string, tenantId?: string | null) {
    await this.findOne(drawingId, tenantId);
    const where: any = { drawingId, deletedAt: IsNull(), tenantId: this.requireTenant(tenantId) };
    return this.revisionRepo.find({ where, order: { revision: 'ASC', versionNumber: 'ASC' } });
  }

  /**
   * Check-in creates a new revision/version row and updates the drawing's
   * current revision + CAD metadata. Every check-in is versioned — nothing
   * is overwritten.
   */
  async checkIn(drawingId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const drawing = await this.findOne(drawingId, tenantId);

    // Enforce checkout ownership when the drawing is checked out
    if (drawing.checkedOutBy && drawing.checkedOutBy !== userId) {
      throw new ConflictException(
        `Drawing is checked out by ${drawing.checkedOutByName ?? drawing.checkedOutBy}`,
      );
    }

    const revision = data.revision ?? drawing.currentRevision ?? 'A';
    const last = await this.revisionRepo.findOne({
      where: { drawingId, revision, deletedAt: IsNull() },
      order: { versionNumber: 'DESC' },
    });
    const versionNumber = (last?.versionNumber ?? 0) + 1;

    const rev = this.revisionRepo.create({
      drawingId,
      revision,
      versionNumber,
      fileName: data.fileName ?? null,
      filePath: data.filePath ?? null,
      mimeType: data.mimeType ?? null,
      fileSize: data.fileSize ?? 0,
      checksum: data.checksum ?? null,
      changeSummary: data.changeSummary ?? null,
      status: DrawingRevisionStatus.DRAFT,
      checkedInBy: userId,
      checkedInByName: data.checkedInByName ?? null,
      checkedInAt: new Date(),
      createdBy: userId,
      updatedBy: userId,
      tenantId: drawing.tenantId ?? tenantId ?? undefined,
    });
    const savedRev = await this.revisionRepo.save(rev);

    drawing.currentRevision = revision;
    drawing.revisionNotes = data.changeSummary ?? drawing.revisionNotes;
    if (data.fileName) drawing.metadata = { ...(drawing.metadata ?? {}), lastFileName: data.fileName };
    if (data.checksum) drawing.lastFileChecksum = data.checksum;
    drawing.cadFileType = data.cadFileType ?? drawing.cadFileType;
    drawing.cadAppName = data.cadAppName ?? drawing.cadAppName;
    drawing.cadAppVersion = data.cadAppVersion ?? drawing.cadAppVersion;
    drawing.fileSizeBytes = data.fileSize ?? drawing.fileSizeBytes;
    drawing.checkedOutBy = null;
    drawing.checkedOutByName = null;
    drawing.checkedOutAt = null;
    drawing.updatedBy = userId;
    await this.drawingRepo.save(drawing);

    this.auditService.logBusinessEvent('engineering.drawing.checkin', 'EngineeringDrawing', drawingId, userId ?? 'system', {
      revision,
      versionNumber,
      tenantId: drawing.tenantId,
    });
    this.publish({
      eventType: EngineeringDomainEventType.DRAWING_CHECKED_IN,
      occurredAt: new Date(),
      drawing,
      actorId: userId,
      payload: { revision, versionNumber, checksum: savedRev.checksum },
    });
    return { revision: savedRev, drawing };
  }

  /** Check-out locks the drawing for exclusive editing. */
  async checkOut(drawingId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const drawing = await this.findOne(drawingId, tenantId);
    if (drawing.checkedOutBy && drawing.checkedOutBy !== userId) {
      throw new ConflictException(
        `Drawing is already checked out by ${drawing.checkedOutByName ?? drawing.checkedOutBy} since ${drawing.checkedOutAt?.toISOString() ?? 'unknown'}`,
      );
    }
    drawing.checkedOutBy = userId;
    drawing.checkedOutByName = data.checkedOutByName ?? null;
    drawing.checkedOutAt = new Date();
    drawing.updatedBy = userId;
    const saved = await this.drawingRepo.save(drawing);
    this.auditService.logBusinessEvent('engineering.drawing.checkout', 'EngineeringDrawing', drawingId, userId ?? 'system', {
      tenantId: drawing.tenantId,
    });
    this.publish({
      eventType: EngineeringDomainEventType.DRAWING_CHECKED_OUT,
      occurredAt: new Date(),
      drawing: saved,
      actorId: userId,
    });
    return saved;
  }

  /** Cancel a checkout (release the lock without creating a revision). */
  async cancelCheckOut(drawingId: string, userId: string, tenantId?: string | null) {
    const drawing = await this.findOne(drawingId, tenantId);
    if (drawing.checkedOutBy && drawing.checkedOutBy !== userId) {
      throw new ConflictException('Cannot cancel another user\'s checkout');
    }
    drawing.checkedOutBy = null;
    drawing.checkedOutByName = null;
    drawing.checkedOutAt = null;
    drawing.updatedBy = userId;
    return this.drawingRepo.save(drawing);
  }

  /**
   * Drawing comparison — structured diff between two revision rows:
   * file metadata, size, checksum, status, change summary.
   */
  async compareRevisions(drawingId: string, revisionA: string, revisionB: string, tenantId?: string | null) {
    await this.findOne(drawingId, tenantId);
    const find = async (revision: string) => {
      const rev = await this.revisionRepo.findOne({
        where: { drawingId, revision, deletedAt: IsNull() },
        order: { versionNumber: 'DESC' },
      });
      if (!rev) throw new NotFoundException(`Revision ${revision} not found for drawing`);
      return rev;
    };
    const a = await find(revisionA);
    const b = await find(revisionB);

    const diff: Record<string, { from: any; to: any; changed: boolean }> = {};
    for (const field of ['fileName', 'filePath', 'mimeType', 'fileSize', 'checksum', 'status', 'changeSummary'] as const) {
      diff[field] = { from: (a as any)[field], to: (b as any)[field], changed: (a as any)[field] !== (b as any)[field] };
    }
    return {
      drawingId,
      revisionA: { revision: a.revision, versionNumber: a.versionNumber, at: a.checkedInAt },
      revisionB: { revision: b.revision, versionNumber: b.versionNumber, at: b.checkedInAt },
      differences: Object.entries(diff).filter(([, v]) => v.changed).map(([k, v]) => ({ field: k, ...v })),
      identical: Object.values(diff).every((v) => !v.changed),
    };
  }

  async getLatestRevision(drawingId: string, tenantId?: string | null) {
    await this.findOne(drawingId, tenantId);
    return this.revisionRepo.findOne({
      where: { drawingId, deletedAt: IsNull() },
      order: { revision: 'DESC', versionNumber: 'DESC' },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async generateDrawingNumber(tenantId: string | null | undefined, attempt = 0): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DRW-${year}-`;
    const where: any = { drawingNumber: Like(`${prefix}%`) };
    if (tenantId) where.tenantId = tenantId;
    const count = await this.drawingRepo.count({ where });
    const seq = count + 1 + attempt;
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  private publish(event: {
    eventType: EngineeringDomainEventType;
    occurredAt: Date;
    drawing: EngineeringDrawing;
    actorId?: string | null;
    payload?: Record<string, any>;
  }) {
    this.eventBus.publish({
      eventType: event.eventType,
      occurredAt: event.occurredAt,
      tenantId: event.drawing.tenantId,
      actorId: event.actorId ?? null,
      payload: {
        projectId: event.drawing.projectId,
        entityId: event.drawing.id,
        entityNumber: event.drawing.drawingNumber,
        ...(event.payload ?? {}),
      },
    });
    this.aiHooks.dispatchEvent({
      eventType: event.eventType,
      occurredAt: event.occurredAt,
      tenantId: event.drawing.tenantId,
      actorId: event.actorId ?? null,
      payload: {
        projectId: event.drawing.projectId,
        entityId: event.drawing.id,
        entityNumber: event.drawing.drawingNumber,
        ...(event.payload ?? {}),
      },
    }).catch(() => undefined);
  }
}
