import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, In } from 'typeorm';
import { EngineeringDrawing } from '../entities/engineering-drawing.entity';
import { EngineeringBom } from '../entities/engineering-bom.entity';
import { EngineeringRouting } from '../entities/engineering-routing.entity';
import { EngineeringReviewRequest, ReviewStatus } from '../entities/engineering-review-request.entity';
import { EngineeringDocument } from '../entities/engineering-document.entity';
import { EngineeringMaterial } from '../entities/engineering-material.entity';
import { EngineeringComponent } from '../entities/engineering-component.entity';
import { EngineeringChangeRequest } from '../../ecr-eco/entities/engineeringchangerequest.entity';

/**
 * Engineering Workspace dashboard: design status, pending reviews, open
 * changes, engineering KPIs. Aggregate SQL keeps this O(1) regardless of
 * artifact count.
 */
@Injectable()
export class EngineeringDashboardService {
  constructor(
    @InjectRepository(EngineeringDrawing) private readonly drawingRepo: Repository<EngineeringDrawing>,
    @InjectRepository(EngineeringBom) private readonly bomRepo: Repository<EngineeringBom>,
    @InjectRepository(EngineeringRouting) private readonly routingRepo: Repository<EngineeringRouting>,
    @InjectRepository(EngineeringReviewRequest) private readonly reviewRepo: Repository<EngineeringReviewRequest>,
    @InjectRepository(EngineeringDocument) private readonly documentRepo: Repository<EngineeringDocument>,
    @InjectRepository(EngineeringMaterial) private readonly materialRepo: Repository<EngineeringMaterial>,
    @InjectRepository(EngineeringComponent) private readonly componentRepo: Repository<EngineeringComponent>,
    @InjectRepository(EngineeringChangeRequest) private readonly ecrRepo: Repository<EngineeringChangeRequest>,
  ) {}

  /** Fail-closed guard — tenant context is mandatory for tenant-scoped data. */
  private requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for tenant-scoped operation');
    }
    return tenantId;
  }

  async getStats(tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const tenantWhere = { tenantId: scopeTenant } as any;

    const [drawingsByStatus, bomsByStatus, routingsByStatus, docsByType, changesByStatus, pendingReviews, openChanges] =
      await Promise.all([
        this.groupCount(this.drawingRepo, 'status', scopeTenant),
        this.groupCount(this.bomRepo, 'status', scopeTenant),
        this.groupCount(this.routingRepo, 'status', scopeTenant),
        this.groupCount(this.documentRepo, 'docType', scopeTenant),
        this.groupCount(this.ecrRepo, 'status', scopeTenant),
        this.reviewRepo.count({
          where: { status: In([ReviewStatus.PENDING, ReviewStatus.IN_REVIEW]), deletedAt: IsNull(), ...tenantWhere },
        }),
        this.ecrRepo.count({
          where: { status: Not(In(CLOSED_STATUSES)), deletedAt: IsNull(), ...tenantWhere },
        }),
      ]);

    const releasedDrawings = drawingsByStatus['RELEASED'] ?? 0;
    const releasedBoms = bomsByStatus['RELEASED'] ?? 0;

    const recent = async (repo: any, select: string[]) =>
      repo.find({ where: { deletedAt: IsNull(), ...tenantWhere }, order: { createdAt: 'DESC' } as any, take: 5, select: select as any });

    const [recentDrawings, recentBoms, recentReviews] = await Promise.all([
      recent(this.drawingRepo, ['id', 'drawingNumber', 'title', 'status', 'currentRevision', 'createdAt']),
      recent(this.bomRepo, ['id', 'bomNumber', 'name', 'status', 'revision', 'totalCost', 'createdAt']),
      recent(this.reviewRepo, ['id', 'reviewNumber', 'title', 'status', 'entityType', 'createdAt']),
    ]);

    return {
      totals: {
        drawings: await this.drawingRepo.count({ where: { deletedAt: IsNull(), ...tenantWhere } }),
        boms: await this.bomRepo.count({ where: { deletedAt: IsNull(), ...tenantWhere } }),
        routings: await this.routingRepo.count({ where: { deletedAt: IsNull(), ...tenantWhere } }),
        documents: await this.documentRepo.count({ where: { deletedAt: IsNull(), ...tenantWhere } }),
        materials: await this.materialRepo.count({ where: { deletedAt: IsNull(), ...tenantWhere } }),
        components: await this.componentRepo.count({ where: { deletedAt: IsNull(), ...tenantWhere } }),
        changes: await this.ecrRepo.count({ where: { deletedAt: IsNull(), ...tenantWhere } }),
      },
      kpis: {
        releasedDrawings,
        releasedBoms,
        pendingReviews,
        openChanges,
        designInProgress: (drawingsByStatus['IN_DESIGN'] ?? 0) + (drawingsByStatus['PEER_REVIEW'] ?? 0) + (drawingsByStatus['LEAD_APPROVAL'] ?? 0),
        changesUnderReview: (changesByStatus['REVIEW'] ?? 0) + (changesByStatus['APPROVAL'] ?? 0),
      },
      byStatus: {
        drawings: drawingsByStatus,
        boms: bomsByStatus,
        routings: routingsByStatus,
        changes: changesByStatus,
      },
      byType: { documents: docsByType },
      recent: { drawings: recentDrawings, boms: recentBoms, reviews: recentReviews },
    };
  }

  /** Pending review queue for the Review Center (any user's pending items). */
  async getPendingReviews(tenantId?: string | null, limit = 50) {
    const scopeTenant = this.requireTenant(tenantId);
    const where: any = { status: In([ReviewStatus.PENDING, ReviewStatus.IN_REVIEW]), deletedAt: IsNull(), tenantId: scopeTenant };
    return this.reviewRepo.find({ where, order: { createdAt: 'ASC' } as any, take: limit });
  }

  private async groupCount(repo: Repository<any>, column: string, tenantId?: string | null): Promise<Record<string, number>> {
    const scopeTenant = this.requireTenant(tenantId);
    const qb = repo.createQueryBuilder('e')
      .select(`e.${column}`, 'key')
      .addSelect('COUNT(*)', 'count')
      .where('e.deleted_at IS NULL')
      .groupBy(`e.${column}`);
    qb.andWhere('e.tenant_id = :tenantId', { tenantId: scopeTenant });
    const rows: { key: string; count: string }[] = await qb.getRawMany();
    const result: Record<string, number> = {};
    for (const row of rows) {
      if (row.key) result[row.key] = parseInt(row.count, 10);
    }
    return result;
  }
}

const CLOSED_STATUSES = ['CLOSED', 'RELEASED', 'REJECTED', 'CANCELLED'];
