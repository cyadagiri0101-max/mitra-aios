import {
  Injectable, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, IsNull, Like, DataSource, EntityManager } from 'typeorm';
import {
  Rfq, RfqStatus, RfqApprovalStatus, RfqWorkflowState,
} from '../entities/rfq.entity';
import { RfqProduct } from '../entities/rfq-product.entity';
import { RfqRevision } from '../entities/rfq-revision.entity';
import { Customer } from '../entities/customer.entity';
import { Quotation } from '../entities/quotation.entity';
import {
  CreateRfqDto, UpdateRfqDto, RfqFilterDto, ExecuteRfqTransitionDto, CreateRfqRevisionDto,
  CreateRfqProductDto,
} from '../dto/rfq.dto';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { WorkflowService } from '../../workflow/services/workflow.service';
import { AuditService } from '../../audit/services/audit.service';
import { NotificationService } from '../../platform/services/notification.service';
import { CommercialAiService } from './commercial-ai.service';

export const RFQ_WORKFLOW_TYPE = 'rfq';

export interface WorkflowActorContext {
  userId: string;
  userRole: string;
  userPermissions: string[];
  tenantId?: string;
}

@Injectable()
export class RfqService extends TenantAwareService<Rfq> {
  constructor(
    @InjectRepository(Rfq)
    repo: Repository<Rfq>,
    @InjectRepository(RfqProduct)
    private readonly productRepo: Repository<RfqProduct>,
    @InjectRepository(RfqRevision)
    private readonly revisionRepo: Repository<RfqRevision>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Quotation)
    private readonly quotationRepo: Repository<Quotation>,
    private readonly workflowService: WorkflowService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly aiService: CommercialAiService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    super(repo, 'RFQ');
  }

  // ── Numbering ─────────────────────────────────────────────────────────────
  private async generateRfqNumber(tenantId?: string | null, attempt = 0): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RFQ-${year}-`;
    const where: any = { rfqNumber: Like(`${prefix}%`), deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const count = await this.repo.count({ where });
    return `${prefix}${String(count + 1 + attempt).padStart(4, '0')}`;
  }

  // ── Create ────────────────────────────────────────────────────────────────
  async createRfq(
    dto: CreateRfqDto,
    actor: WorkflowActorContext,
  ): Promise<Rfq> {
    const { products, ...rfqData } = dto;

    if (dto.customerId) {
      const customer = await this.customerRepo.findOne({
        where: { id: dto.customerId, deletedAt: IsNull() },
      });
      if (!customer) throw new NotFoundException('Customer not found');
    }

    let saved: Rfq | undefined;
    let lastErr: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      const rfqNumber = await this.generateRfqNumber(actor.tenantId, attempt);
      const entity = this.repo.create({
        ...rfqData,
        rfqNumber,
        workflowState: RfqWorkflowState.DRAFT,
        approvalStatus: RfqApprovalStatus.PENDING,
        status: RfqStatus.OPEN,
        revisionNumber: 1,
        ...(actor.tenantId ? { tenantId: actor.tenantId } : {}),
        ...(actor.userId ? { createdBy: actor.userId, updatedBy: actor.userId } : {}),
      } as unknown as Rfq);
      try {
        saved = await this.repo.save(entity);
        break;
      } catch (err: any) {
        if (err?.code !== '23505') throw err;
        lastErr = err;
      }
    }
    if (!saved) throw lastErr;

    if (products && products.length > 0) {
      await this.replaceProducts(saved.id, products, actor.userId, actor.tenantId);
    }

    // ── Workflow instance (configurable state transitions) ──────────────
    await this.workflowService.createInstance(
      RFQ_WORKFLOW_TYPE, 'rfq', saved.id, this.toWorkflowContext(actor),
    );

    await this.auditService.logBusinessEvent(
      'rfq.created', 'Rfq', saved.id, actor.userId ?? 'system', 
      { rfqNumber: saved.rfqNumber, customerName: saved.customerName, tenantId: actor.tenantId },
    );
    await this.aiService.syncEntityContext('rfq', saved.id, {
      rfqNumber: saved.rfqNumber,
      customerName: saved.customerName,
      customerId: saved.customerId,
      moldType: saved.moldType,
      material: saved.material,
      annualVolume: saved.annualVolume,
      priority: saved.priority,
      workflowState: saved.workflowState,
    }, actor.userId, actor.tenantId);

    return this.findOneWithDetails(saved.id, actor.tenantId);
  }

  private toWorkflowContext(actor: WorkflowActorContext) {
    return {
      userId: actor.userId,
      userRole: actor.userRole ? [actor.userRole] : [],
      userPermissions: actor.userPermissions ?? [],
      tenantId: actor.tenantId ?? undefined,
    };
  }

  // ── Read ──────────────────────────────────────────────────────────────────
  async findAllFiltered(
    tenantId?: string | null,
    page = 1,
    limit = 20,
    search?: string,
    filters: RfqFilterDto = {},
  ) {
    const qb = this.repo.createQueryBuilder('r')
      .leftJoinAndSelect('r.products', 'products')
      .where('r.deletedAt IS NULL')
      .orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (tenantId) qb.andWhere('r.tenantId = :tenantId', { tenantId });
    if (filters.status) qb.andWhere('r.status = :status', { status: filters.status });
    if (filters.workflowState) qb.andWhere('r.workflowState = :workflowState', { workflowState: filters.workflowState });
    if (filters.approvalStatus) qb.andWhere('r.approvalStatus = :approvalStatus', { approvalStatus: filters.approvalStatus });
    if (filters.priority) qb.andWhere('r.priority = :priority', { priority: filters.priority });
    if (filters.customerId) qb.andWhere('r.customerId = :customerId', { customerId: filters.customerId });
    if (filters.moldType) qb.andWhere('r.moldType = :moldType', { moldType: filters.moldType });
    if (search) {
      qb.andWhere(
        '(r.rfqNumber ILIKE :search OR r.customerName ILIKE :search OR r.technicalNotes ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneWithDetails(id: string, tenantId?: string | null) {
    const rfq = await this.findOne(id, tenantId);
    const products = await this.productRepo.find({
      where: { rfqId: id, deletedAt: IsNull() },
      order: { lineNumber: 'ASC' },
    });
    const revisions = await this.revisionRepo.find({
      where: { rfqId: id, deletedAt: IsNull() },
      order: { revisionNumber: 'DESC' },
    });
    const workflow = await this.workflowService.findInstanceByEntity('rfq', id, tenantId ?? undefined);
    const quotations = await this.quotationRepo.find({
      where: { rfqId: id, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    (rfq as unknown as Record<string, unknown>)['products'] = products;
    (rfq as unknown as Record<string, unknown>)['revisions'] = revisions;
    (rfq as unknown as Record<string, unknown>)['workflow'] = workflow
      ? { state: workflow.currentState.stateCode, history: workflow.history ?? [] }
      : null;
    (rfq as unknown as Record<string, unknown>)['quotations'] = quotations;
    return rfq;
  }

  // ── Update ────────────────────────────────────────────────────────────────
  async updateRfq(
    id: string,
    dto: UpdateRfqDto,
    actor: WorkflowActorContext,
  ): Promise<Rfq> {
    const rfq = await this.findOne(id, actor.tenantId);
    if (rfq.workflowState === RfqWorkflowState.REJECTED || rfq.workflowState === RfqWorkflowState.CANCELLED) {
      throw new BadRequestException(`Cannot update a ${rfq.workflowState.toLowerCase()} RFQ`);
    }

    const { products, ...rfqData } = dto as unknown as Record<string, unknown>;
    const allowed = this.extractAllowedFields(rfqData);
    const changedMaterialFields = ['moldType', 'material', 'annualVolume', 'targetQuantity', 'dueDate']
      .some((f) => Object.prototype.hasOwnProperty.call(allowed, f));

    if (changedMaterialFields) {
      await this.captureRevision(id, rfq, allowed, actor.userId);
    }

    Object.assign(rfq, allowed, actor.userId ? { updatedBy: actor.userId } : {});
    const saved = await this.repo.save(rfq);

    if (products !== undefined) {
      await this.replaceProducts(id, (products ?? []) as CreateRfqProductDto[], actor.userId, actor.tenantId);
    }

    await this.auditService.logBusinessEvent(
      'rfq.updated', 'Rfq', id, actor.userId ?? 'system', 
      { rfqNumber: saved.rfqNumber, fields: Object.keys(allowed), tenantId: actor.tenantId },
    );
    await this.aiService.syncEntityContext('rfq', id, {
      rfqNumber: saved.rfqNumber,
      material: saved.material,
      moldType: saved.moldType,
      workflowState: saved.workflowState,
    }, actor.userId, actor.tenantId);

    return this.findOneWithDetails(id, actor.tenantId);
  }

  // ── Products ──────────────────────────────────────────────────────────────
  async replaceProducts(
    rfqId: string,
    products: NonNullable<CreateRfqDto['products']>,
    userId?: string,
    tenantId?: string | null,
  ): Promise<void> {
    await this.productRepo.update({ rfqId, deletedAt: IsNull() }, { deletedAt: new Date() });
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      await this.productRepo.save(this.productRepo.create({
        rfqId,
        lineNumber: p.lineNumber ?? i + 1,
        productName: p.productName,
        productCode: p.productCode ?? null,
        description: p.description ?? null,
        quantity: p.quantity ?? 1,
        unit: p.unit ?? 'NOS',
        material: p.material ?? null,
        targetPrice: p.targetPrice ?? null,
        deliveryWeeks: p.deliveryWeeks ?? null,
        notes: p.notes ?? null,
        ...(tenantId ? { tenantId } : {}),
        ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
      } as unknown as RfqProduct));
    }
  }

  async addProduct(
    rfqId: string,
    product: NonNullable<CreateRfqDto['products']>[number],
    userId?: string,
    tenantId?: string | null,
  ): Promise<RfqProduct> {
    await this.findOne(rfqId, tenantId);
    const count = await this.productRepo.count({ where: { rfqId, deletedAt: IsNull() } });
    return this.productRepo.save(this.productRepo.create({
      rfqId,
      lineNumber: product.lineNumber ?? count + 1,
      productName: product.productName,
      productCode: product.productCode ?? null,
      description: product.description ?? null,
      quantity: product.quantity ?? 1,
      unit: product.unit ?? 'NOS',
      material: product.material ?? null,
      targetPrice: product.targetPrice ?? null,
      deliveryWeeks: product.deliveryWeeks ?? null,
      notes: product.notes ?? null,
      ...(tenantId ? { tenantId } : {}),
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as unknown as RfqProduct));
  }

  async removeProduct(rfqId: string, productId: string, tenantId?: string | null) {
    await this.findOne(rfqId, tenantId);
    const product = await this.productRepo.findOne({
      where: { id: productId, rfqId, deletedAt: IsNull() },
    });
    if (!product) throw new NotFoundException('RFQ product not found');
    product.deletedAt = new Date();
    await this.productRepo.save(product);
    return { deleted: true, id: productId };
  }

  // ── Revisions (version history) ───────────────────────────────────────────
  private async captureRevision(
    rfqId: string,
    rfq: Rfq,
    allowed: Record<string, unknown>,
    userId?: string,
  ): Promise<void> {
    const nextNumber = rfq.revisionNumber + 1;
    const revision = this.revisionRepo.create({
      rfqId,
      revisionNumber: nextNumber,
      changeSummary: `Content revision ${nextNumber}`,
      payload: {
        changedFields: Object.keys(allowed),
        before: {
          moldType: rfq.moldType,
          material: rfq.material,
          annualVolume: rfq.annualVolume,
          targetQuantity: rfq.targetQuantity,
          dueDate: rfq.dueDate,
        },
        after: allowed,
      },
      revisedBy: userId ?? null,
      ...(userId ? { createdBy: userId } : {}),
    } as unknown as RfqRevision);
    await this.revisionRepo.save(revision);
    rfq.revisionNumber = nextNumber;
  }

  async createRevision(
    id: string,
    dto: CreateRfqRevisionDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<RfqRevision> {
    const rfq = await this.findOne(id, tenantId);
    const nextNumber = rfq.revisionNumber + 1;
    const revision = this.revisionRepo.create({
      rfqId: id,
      revisionNumber: nextNumber,
      changeSummary: dto.changeSummary,
      revisedBy: userId ?? null,
      ...(userId ? { createdBy: userId } : {}),
      ...(tenantId ? { tenantId } : {}),
    } as unknown as RfqRevision);
    const saved = await this.revisionRepo.save(revision);
    rfq.revisionNumber = nextNumber;
    rfq.updatedBy = userId ?? null;

    await this.repo.save(rfq);
    await this.auditService.logBusinessEvent(
      'rfq.revised', 'Rfq', id, userId ?? 'system', 
      { revisionNumber: nextNumber, changeSummary: dto.changeSummary, tenantId },
    );
    return saved;
  }

  async findRevisions(id: string, tenantId?: string | null) {
    await this.findOne(id, tenantId);
    return this.revisionRepo.find({
      where: { rfqId: id, deletedAt: IsNull() },
      order: { revisionNumber: 'DESC' },
    });
  }

  // ── Workflow transitions (config-driven, fully transactional) ─────────────
  /**
   * Execute a workflow transition atomically (C-3 remediation):
   *
   *   1. Workflow instance state change      (write)
   *   2. RFQ entity sync (workflowState, approvalStatus, status)  (write)
   *   3. Audit record                        (write)
   *   4. Notification enqueue                (write)
   *   5. Commit
   *
   * If ANY step fails the entire transition is rolled back — the workflow
   * instance, RFQ, audit trail and notification stay consistent.
   */
  async executeTransition(
    id: string,
    dto: ExecuteRfqTransitionDto,
    actor: WorkflowActorContext,
  ): Promise<Rfq> {
    let syncState: { rfqNumber: string; workflowState: string; approvalStatus?: string } | null = null;
    await this.dataSource.transaction(async (em: EntityManager) => {
      const rfqRepo = em.getRepository(Rfq);
      const rfqWhere: any = { id, deletedAt: IsNull() };
      if (actor.tenantId) rfqWhere.tenantId = actor.tenantId;
      const rfq = await rfqRepo.findOne({ where: rfqWhere });
      if (!rfq) throw new NotFoundException('RFQ not found');

      const instance = await this.workflowService.findInstanceByEntity(
        'rfq', id, actor.tenantId ?? undefined, em,
      );
      if (!instance) {
        throw new BadRequestException('No workflow instance found for this RFQ');
      }
      const fromState = instance.currentState.stateCode;

      const updated = await this.workflowService.executeTransition(
        instance.id, dto.transitionId, {
          ...this.toWorkflowContext(actor),
          remarks: dto.remarks,
        },
        em,
      );

      const newState = updated.currentState.stateCode as RfqWorkflowState;
      rfq.workflowState = newState;
      rfq.updatedBy = actor.userId;

      if (newState === RfqWorkflowState.APPROVED) {
        rfq.approvalStatus = RfqApprovalStatus.APPROVED;
      } else if (newState === RfqWorkflowState.REJECTED) {
        rfq.approvalStatus = RfqApprovalStatus.REJECTED;
        rfq.status = RfqStatus.CLOSED;
      } else if (newState === RfqWorkflowState.CANCELLED) {
        rfq.status = RfqStatus.CANCELLED;
      } else if (newState === RfqWorkflowState.PROJECT_READY) {
        rfq.status = RfqStatus.CLOSED;
      }

      const saved = await rfqRepo.save(rfq);
      syncState = {
        rfqNumber: saved.rfqNumber,
        workflowState: newState,
        approvalStatus: saved.approvalStatus ?? undefined,
      };

      // Audit record — inside the same transaction
      await this.auditService.logBusinessEvent(
        'rfq.transition', 'Rfq', id, actor.userId ?? 'system',
        {
          from: fromState,
          to: newState,
          transitionId: dto.transitionId,
          remarks: dto.remarks ?? null,
          tenantId: actor.tenantId,
        },
        em,
      );

      // Notification — inside the same transaction
      await this.notificationService.enqueue({
        channel: 'inapp',
        recipient: actor.userId ?? 'system',
        subject: `RFQ ${saved.rfqNumber} transitioned: ${fromState} → ${newState}`,
        body: dto.remarks ?? undefined,
        tenantId: actor.tenantId ?? null,
      }, em);
    });

    // Post-commit side effects — never roll the transaction back
    try {
      if (syncState) {
        await this.aiService.syncEntityContext('rfq', id, syncState, actor.userId, actor.tenantId);
      }
    } catch (err) {
      // AI sync is best-effort; log and continue
      console.warn(`[RFQ] AI context sync skipped for ${id}:`, (err as Error).message);
    }

    return this.findOneWithDetails(id, actor.tenantId);
  }

  async getAvailableTransitions(id: string, actor: WorkflowActorContext) {
    const instance = await this.workflowService.findInstanceByEntity(
      'rfq', id, actor.tenantId ?? undefined,
    );
    if (!instance) {
      throw new BadRequestException('No workflow instance found for this RFQ');
    }
    return this.workflowService.findTransitionsForState(
      instance.currentStateId, actor.tenantId ?? undefined, RFQ_WORKFLOW_TYPE,
    );
  }
}
