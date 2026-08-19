import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { EngineeringDrawing } from '../entities/engineering-drawing.entity';
import { EngineeringBom } from '../entities/engineering-bom.entity';
import { EngineeringRouting } from '../entities/engineering-routing.entity';
import { EngineeringBomRevision } from '../entities/engineering-bom-revision.entity';
import { EngineeringDrawingRevision } from '../entities/engineering-drawing-revision.entity';
import { AuditService } from '../../audit/services/audit.service';
import { EngineeringEventBus } from './engineering-event-bus.service';
import { EngineeringDomainEventType } from '../events/engineering.events';
import { EngineeringBomService } from './engineering-bom.service';

export enum EngineeringReleaseState {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  REVIEWED = 'REVIEWED',
  FROZEN = 'FROZEN',
  APPROVED = 'APPROVED',
  RELEASED = 'RELEASED',
  OBSOLETE = 'OBSOLETE',
}

export type EngineeringEntityType = 'drawing' | 'bom' | 'routing';

export interface ReleaseCertificate {
  entityType: EngineeringEntityType;
  entityId: string;
  entityNumber: string;
  revision: string;
  versionNumber: number;
  status: string;
  isFrozen: boolean;
  frozenAt: Date | null;
  frozenBy: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  releasedAt: Date | null;
  releasedBy: string | null;
  projectId: string;
  tenantId: string;
  manufacturingReady: boolean;
}

@Injectable()
export class EngineeringReleaseService {
  constructor(
    @InjectRepository(EngineeringDrawing)
    private readonly drawingRepo: Repository<EngineeringDrawing>,
    @InjectRepository(EngineeringBom)
    private readonly bomRepo: Repository<EngineeringBom>,
    @InjectRepository(EngineeringRouting)
    private readonly routingRepo: Repository<EngineeringRouting>,
    @InjectRepository(EngineeringBomRevision)
    private readonly bomRevisionRepo: Repository<EngineeringBomRevision>,
    @InjectRepository(EngineeringDrawingRevision)
    private readonly drawingRevisionRepo: Repository<EngineeringDrawingRevision>,
    private readonly bomService: EngineeringBomService,
    private readonly auditService: AuditService,
    private readonly eventBus: EngineeringEventBus,
    private readonly dataSource: DataSource,
  ) {}

  private requireTenant(tenantId?: string | null): string {
    if (!tenantId || tenantId.trim() === '') {
      throw new ForbiddenException('Tenant context is required');
    }
    return tenantId;
  }

  private getRepo(entityType: EngineeringEntityType): Repository<any> {
    switch (entityType) {
      case 'drawing':
        return this.drawingRepo;
      case 'bom':
        return this.bomRepo;
      case 'routing':
        return this.routingRepo;
      default:
        throw new BadRequestException(`Unsupported engineering entity type: ${entityType}`);
    }
  }

  async getReleaseStatus(
    entityType: EngineeringEntityType,
    entityId: string,
    tenantId?: string | null,
  ): Promise<ReleaseCertificate> {
    const scopeTenant = this.requireTenant(tenantId);
    const repo = this.getRepo(entityType);
    const entity = await repo.findOne({
      where: { id: entityId, deletedAt: IsNull(), tenantId: scopeTenant },
    });
    if (!entity) {
      throw new NotFoundException(`${entityType} not found`);
    }

    const entityNumber =
      entity.drawingNumber || entity.bomNumber || entity.routingNumber || entity.id;
    const revision = entity.currentRevision || entity.revision || 'A';
    const isReleased = entity.status === EngineeringReleaseState.RELEASED;

    return {
      entityType,
      entityId: entity.id,
      entityNumber,
      revision,
      versionNumber: entity.versionNumber ?? 1,
      status: entity.status,
      isFrozen: entity.status === EngineeringReleaseState.FROZEN,
      frozenAt: entity.status === EngineeringReleaseState.FROZEN ? entity.updatedAt : null,
      frozenBy: entity.status === EngineeringReleaseState.FROZEN ? entity.updatedBy : null,
      approvedAt: entity.approvedAt ?? null,
      approvedBy: entity.approvedBy ?? null,
      releasedAt: entity.releasedAt ?? null,
      releasedBy: entity.releasedBy ?? null,
      projectId: entity.projectId,
      tenantId: scopeTenant,
      manufacturingReady: isReleased,
    };
  }

  async freezeArtifact(
    entityType: EngineeringEntityType,
    entityId: string,
    notes: string | undefined,
    userId: string,
    tenantId?: string | null,
  ) {
    const scopeTenant = this.requireTenant(tenantId);
    const repo = this.getRepo(entityType);
    const entity = await repo.findOne({
      where: { id: entityId, deletedAt: IsNull(), tenantId: scopeTenant },
    });
    if (!entity) {
      throw new NotFoundException(`${entityType} not found`);
    }

    if (entity.status === EngineeringReleaseState.RELEASED) {
      throw new BadRequestException(`Cannot freeze an already RELEASED ${entityType}`);
    }

    const previousStatus = entity.status;
    entity.status = EngineeringReleaseState.FROZEN;
    entity.updatedBy = userId;
    const saved = await repo.save(entity);

    await this.auditService.logBusinessEvent(
      `engineering.${entityType}.frozen`,
      `Engineering${entityType[0].toUpperCase()}${entityType.slice(1)}`,
      entity.id,
      userId,
      {
        previousStatus,
        status: EngineeringReleaseState.FROZEN,
        notes,
        projectId: entity.projectId,
        tenantId: scopeTenant,
      },
      undefined,
      entity.projectId,
    );

    return saved;
  }

  async releaseArtifact(
    entityType: EngineeringEntityType,
    entityId: string,
    notes: string | undefined,
    userId: string,
    tenantId?: string | null,
  ) {
    const scopeTenant = this.requireTenant(tenantId);
    const repo = this.getRepo(entityType);
    const entity = await repo.findOne({
      where: { id: entityId, deletedAt: IsNull(), tenantId: scopeTenant },
    });
    if (!entity) {
      throw new NotFoundException(`${entityType} not found`);
    }

    if (entity.status === EngineeringReleaseState.RELEASED) {
      return entity; // Idempotent
    }

    const previousStatus = entity.status;
    const now = new Date();
    entity.status = EngineeringReleaseState.RELEASED;
    entity.approvedAt = entity.approvedAt ?? now;
    entity.approvedBy = entity.approvedBy ?? userId;
    entity.releasedAt = now;
    entity.releasedBy = userId;
    entity.updatedBy = userId;

    const saved = await repo.save(entity);

    // If BOM, ensure snapshot is preserved in engineering_bom_revisions
    if (entityType === 'bom') {
      const rev = entity.revision || 'A';
      const existingRev = await this.bomRevisionRepo.findOne({
        where: { bomId: entity.id, revision: rev, deletedAt: IsNull(), tenantId: scopeTenant },
      });
      if (!existingRev) {
        const items = await this.bomService.listItems(entity.id, scopeTenant);
        const snapshot = {
          bom: {
            id: entity.id,
            bomNumber: entity.bomNumber,
            name: entity.name,
            revision: rev,
            totalCost: entity.totalCost,
          },
          items: items.map((i) => ({
            id: i.id,
            lineNumber: i.lineNumber,
            partNumber: i.partNumber,
            partName: i.partName,
            itemType: i.itemType,
            sourceType: i.sourceType,
            quantityPer: i.quantityPer,
            quantity: i.quantity,
            uom: i.uom,
            unitCost: i.unitCost,
            extendedCost: i.extendedCost,
            material: (i as any).material ?? null,
            reference: i.reference,
          })),
        };

        const revisionRecord = this.bomRevisionRepo.create({
          bomId: entity.id,
          revision: rev,
          versionNumber: entity.versionNumber ?? 1,
          snapshot,
          totalCost: entity.totalCost,
          changeSummary: notes ?? 'Formal Engineering Release',
          releasedBy: userId,
          releasedAt: now,
          createdBy: userId,
          updatedBy: userId,
          tenantId: scopeTenant,
        });
        await this.bomRevisionRepo.save(revisionRecord);
      }
    }

    await this.auditService.logBusinessEvent(
      `engineering.${entityType}.released`,
      `Engineering${entityType[0].toUpperCase()}${entityType.slice(1)}`,
      entity.id,
      userId,
      {
        previousStatus,
        status: EngineeringReleaseState.RELEASED,
        notes,
        projectId: entity.projectId,
        tenantId: scopeTenant,
      },
      undefined,
      entity.projectId,
    );

    const eventType =
      entityType === 'bom'
        ? EngineeringDomainEventType.BOM_RELEASED
        : entityType === 'drawing'
        ? EngineeringDomainEventType.DRAWING_RELEASED
        : EngineeringDomainEventType.ROUTING_RELEASED;

    this.eventBus.publish({
      eventType,
      occurredAt: now,
      tenantId: scopeTenant,
      actorId: userId,
      payload: {
        projectId: entity.projectId,
        entityId: entity.id,
        entityNumber: entity.drawingNumber || entity.bomNumber || entity.routingNumber,
        status: EngineeringReleaseState.RELEASED,
      },
    });

    return saved;
  }
}
