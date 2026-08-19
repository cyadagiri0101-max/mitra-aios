import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { TrialObservation, TrialResult } from '../entities/trialobservation.entity';
import { Retrial } from '../entities/retrial.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';
import { AuthUser } from '@common/decorators/current-user.decorator';

/**
 * Trial observations (Quality). Sprint 2.3.1 G-1: trials reference the
 * part / drawing / BOM item / routing under evaluation. Links are
 * existence-validated against the engineering tables (raw reads — no
 * relations). Trials are part of the release process, so RELEASED status
 * is NOT required.
 */
@Injectable()
export class TrialObservationService extends TenantAwareService<TrialObservation> {
  constructor(
    @InjectRepository(TrialObservation)
    repo: Repository<TrialObservation>,
    @InjectRepository(Retrial)
    private readonly retrialRepo: Repository<Retrial>,
    private readonly dataSource: DataSource,
    private readonly outboxService: OutboxService,
  ) {
    super(repo, 'TrialObservation');
  }

  async create(data: Record<string, unknown>, userId?: string, tenantId?: string | null) {
    if (!data.trialNumber) {
      data.trialNumber = `TRL-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    }
    await this.validateArtifactLinks(data, tenantId);
    return super.create(data, userId, tenantId);
  }

  async update(id: string, data: Record<string, unknown>, userId?: string, tenantId?: string | null) {
    await this.validateArtifactLinks(data, tenantId);
    return super.update(id, data, userId, tenantId);
  }

  /**
   * Request a formal Retrial when a trial fails or yields conditional results.
   */
  async requestRetrial(
    trialId: string,
    user: AuthUser,
    dto: { retrialReason: string; changesMade?: string; scheduledDate?: string },
  ) {
    const scopeTenant = this.requireTenant(user.tenantId);
    return this.dataSource.transaction(async (em) => {
      const trial = await em.getRepository(TrialObservation).findOne({
        where: { id: trialId, tenantId: scopeTenant, deletedAt: IsNull() },
      });
      if (!trial) throw new NotFoundException('Trial observation not found');

      const retrialSequence = (trial.trialSequence ?? 1) + 1;
      const retrialNumber = `RTR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

      const retrial = em.getRepository(Retrial).create({
        retrialNumber,
        originalTrialId: trial.id,
        projectId: trial.projectId,
        partId: trial.partId,
        drawingId: trial.drawingId,
        bomItemId: trial.bomItemId,
        routingId: trial.routingId,
        retrialSequence,
        retrialReason: dto.retrialReason,
        changesMade: dto.changesMade ?? null,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        status: 'SCHEDULED',
        requestedBy: user.id,
        tenantId: scopeTenant,
        createdBy: user.id,
        updatedBy: user.id,
      });
      const savedRetrial = await em.getRepository(Retrial).save(retrial);

      await em.getRepository(TrialObservation).update(
        { id: trial.id, tenantId: scopeTenant },
        {
          nextAction: `Retrial requested: ${dto.retrialReason} (${retrialNumber})`,
          updatedBy: user.id,
        } as any,
      );

      await this.outboxService.append(
        'quality.retrial.requested' as any,
        'retrial',
        savedRetrial.id,
        {
          retrialId: savedRetrial.id,
          retrialNumber: savedRetrial.retrialNumber,
          originalTrialId: trial.id,
          trialNumber: trial.trialNumber,
          projectId: trial.projectId,
          retrialSequence,
        },
        { tenantId: scopeTenant, actorId: user.id, em },
      );

      return savedRetrial;
    });
  }

  /**
   * Approve a requested retrial (Human Engineering/Quality Authority).
   */
  async approveRetrial(retrialId: string, user: AuthUser, dto: { remarks?: string } = {}) {
    const scopeTenant = this.requireTenant(user.tenantId);
    return this.dataSource.transaction(async (em) => {
      const retrial = await em.getRepository(Retrial).findOne({
        where: { id: retrialId, tenantId: scopeTenant, deletedAt: IsNull() },
      });
      if (!retrial) throw new NotFoundException('Retrial not found');
      if (retrial.status === 'APPROVED') {
        throw new BadRequestException('Retrial is already approved');
      }

      await em.getRepository(Retrial).update(
        { id: retrial.id, tenantId: scopeTenant },
        {
          status: 'APPROVED',
          approvedBy: user.id,
          remarks: dto.remarks ?? retrial.remarks,
          updatedBy: user.id,
        } as any,
      );

      await this.outboxService.append(
        'quality.retrial.approved' as any,
        'retrial',
        retrial.id,
        {
          retrialId: retrial.id,
          retrialNumber: retrial.retrialNumber,
          originalTrialId: retrial.originalTrialId,
          approvedBy: user.id,
        },
        { tenantId: scopeTenant, actorId: user.id, em },
      );

      return em.getRepository(Retrial).findOne({ where: { id: retrial.id, tenantId: scopeTenant } });
    });
  }

  /**
   * Create an Engineering Change Request (ECR) directly from a failed trial.
   */
  async createEcrFromTrial(
    trialId: string,
    user: AuthUser,
    dto: { title?: string; changeDescription?: string; reason?: string; priority?: string } = {},
  ) {
    const scopeTenant = this.requireTenant(user.tenantId);
    return this.dataSource.transaction(async (em) => {
      const trial = await em.getRepository(TrialObservation).findOne({
        where: { id: trialId, tenantId: scopeTenant, deletedAt: IsNull() },
      });
      if (!trial) throw new NotFoundException('Trial observation not found');

      const ecrNumber = `ECR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const title = dto.title ?? `Tooling Revision from Trial ${trial.trialNumber}`;
      const defectSummary = Array.isArray(trial.defectsObserved) ? trial.defectsObserved.join(', ') : 'N/A';
      const description = dto.changeDescription ?? `Trial ${trial.trialNumber} observed defects: ${defectSummary}. Observations: ${trial.observations ?? 'N/A'}. Corrective Action: ${trial.correctiveActions ?? 'Tool modification required.'}`;
      const reason = dto.reason ?? `Failed Trial ${trial.trialNumber} defect remediation`;

      const insertRows = await em.query(
        `INSERT INTO engineering_change_requests (
          id, ecr_number, title, change_description, change_reason, change_type, priority, status,
          project_id, drawing_id, requested_date,
          tenant_id, created_by, updated_by, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, 'TOOLING', $5, 'DRAFT',
          $6, $7, CURRENT_DATE,
          $8, $9, $9, NOW(), NOW()
        ) RETURNING *`,
        [
          ecrNumber, title, description, reason, dto.priority ?? 'HIGH',
          trial.projectId, trial.drawingId,
          scopeTenant, user.id,
        ],
      );
      const createdEcr = insertRows[0];

      await em.getRepository(TrialObservation).update(
        { id: trial.id, tenantId: scopeTenant },
        {
          nextAction: `ECR created: ${ecrNumber}`,
          updatedBy: user.id,
        } as any,
      );

      await this.outboxService.append(
        EngineeringDomainEventType.CHANGE_REQUESTED,
        'engineering_change_request',
        createdEcr.id,
        {
          entityId: createdEcr.id,
          ecrNumber: createdEcr.ecr_number,
          title: createdEcr.title,
          trialId: trial.id,
          projectId: trial.projectId,
        },
        { tenantId: scopeTenant, actorId: user.id, em },
      );

      return createdEcr;
    });
  }

  private async validateArtifactLinks(data: Record<string, unknown>, tenantId?: string | null): Promise<void> {
    const scopeTenant = this.requireTenant(tenantId);
    if (data.drawingId) await this.assertExists('engineering_drawings', data.drawingId, 'Drawing', scopeTenant);
    if (data.bomItemId) await this.assertExists('engineering_bom_items', data.bomItemId, 'BOM item', scopeTenant);
    if (data.routingId) await this.assertExists('engineering_routings', data.routingId, 'Routing', scopeTenant);
  }

  private async assertExists(table: string, id: unknown, label: string, tenantId?: string | null) {
    const rows = await this.dataSource.query(
      `SELECT id FROM "${table}" WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId],
    );
    if (!rows?.length) throw new BadRequestException(`${label} not found — no orphan trial links`);
  }
}
