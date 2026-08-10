import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, In } from 'typeorm';
import { EngineeringDrawing } from '../entities/engineering-drawing.entity';
import { EngineeringBom } from '../entities/engineering-bom.entity';
import { EngineeringRouting } from '../entities/engineering-routing.entity';
import { EngineeringReviewRequest } from '../entities/engineering-review-request.entity';
import { EngineeringDocument } from '../entities/engineering-document.entity';
import { EngineeringChangeRequest } from '../../ecr-eco/entities/engineeringchangerequest.entity';
import { EngineeringChangeOrder } from '../../ecr-eco/entities/engineeringchangeorder.entity';
import { EngineeringChangeNotice } from '../../ecr-eco/entities/engineering-change-notice.entity';
import { EngineeringChangeImpact } from '../../ecr-eco/entities/engineering-change-impact.entity';

/**
 * End-to-end traceability for the Engineering Domain.
 *
 * Every engineering object maintains links to Customer → RFQ → Quotation →
 * Project → Drawing → BOM → Process Plan → Manufacturing Order → Quality.
 * This service renders those links on demand, per project and per entity.
 */
@Injectable()
export class EngineeringTraceabilityService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(EngineeringDrawing) private readonly drawingRepo: Repository<EngineeringDrawing>,
    @InjectRepository(EngineeringBom) private readonly bomRepo: Repository<EngineeringBom>,
    @InjectRepository(EngineeringRouting) private readonly routingRepo: Repository<EngineeringRouting>,
    @InjectRepository(EngineeringReviewRequest) private readonly reviewRepo: Repository<EngineeringReviewRequest>,
    @InjectRepository(EngineeringDocument) private readonly documentRepo: Repository<EngineeringDocument>,
    @InjectRepository(EngineeringChangeRequest) private readonly ecrRepo: Repository<EngineeringChangeRequest>,
    @InjectRepository(EngineeringChangeOrder) private readonly ecoRepo: Repository<EngineeringChangeOrder>,
    @InjectRepository(EngineeringChangeNotice) private readonly ecnRepo: Repository<EngineeringChangeNotice>,
    @InjectRepository(EngineeringChangeImpact) private readonly impactRepo: Repository<EngineeringChangeImpact>,
  ) {}

  /**
   * Full artifact map for a project: customer/RFQ/quotation context (from
   * the project row), drawings, BOMs, routings, changes, reviews,
   * documents, manufacturing orders and quality records.
   */
  async byProject(projectId: string, tenantId?: string | null) {
    const tenantWhere = (tenantId ? { tenantId } : {}) as any;

    const [
      drawings, boms, routings, reviews, documents,
      ecrs, ecos, ecns,
    ] = await Promise.all([
      this.drawingRepo.find({ where: { projectId, deletedAt: IsNull(), ...tenantWhere }, order: { createdAt: 'DESC' } as any }),
      this.bomRepo.find({ where: { projectId, deletedAt: IsNull(), ...tenantWhere }, order: { createdAt: 'DESC' } as any }),
      this.routingRepo.find({ where: { projectId, deletedAt: IsNull(), ...tenantWhere }, order: { createdAt: 'DESC' } as any }),
      this.reviewRepo.find({ where: { projectId, deletedAt: IsNull(), ...tenantWhere }, order: { createdAt: 'DESC' } as any }),
      this.documentRepo.find({ where: { projectId, deletedAt: IsNull(), ...tenantWhere }, order: { createdAt: 'DESC' } as any }),
      this.ecrRepo.find({ where: { projectId, deletedAt: IsNull(), ...tenantWhere }, order: { createdAt: 'DESC' } as any }),
      this.ecoRepo.find({ where: { projectId, deletedAt: IsNull(), ...tenantWhere }, order: { createdAt: 'DESC' } as any }),
      this.ecnRepo.find({ where: { projectId, deletedAt: IsNull(), ...tenantWhere }, order: { createdAt: 'DESC' } as any }),
    ]);

    const ecrIds = ecrs.map((e) => e.id);
    const ecnIds = ecns.map((n) => n.id);

    const [impacts] = await Promise.all([
      ecrIds.length
        ? this.impactRepo.find({ where: { ecrId: In(ecrIds), deletedAt: IsNull(), ...tenantWhere } })
        : Promise.resolve([]),
    ]);

    // Manufacturing orders + quality records via the shared project link.
    // Cross-module tables are read raw — they are authoritative sources.
    const [workOrders, qualityRecords] = await Promise.all([
      this.dataSource.query(
        `SELECT id, wo_number, operation_type, status, planned_qty, completed_qty, planned_start_date, planned_end_date
         FROM work_orders WHERE project_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 200`,
        [projectId],
      ).catch(() => []),
      this.dataSource.query(
        `SELECT id, trial_number, trial_type, status, trial_date
         FROM trial_observations WHERE project_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 200`,
        [projectId],
      ).catch(() => []),
    ]);

    return {
      projectId,
      context: {
        drawings: drawings.length,
        boms: boms.length,
        routings: routings.length,
        changes: ecrs.length + ecos.length + ecns.length,
        reviews: reviews.length,
        documents: documents.length,
      },
      drawings,
      boms,
      routings,
      changes: { requests: ecrs, orders: ecos, notices: ecns, impacts },
      reviews,
      documents,
      manufacturing: { workOrders },
      quality: { records: qualityRecords },
    };
  }

  /**
   * Trace a single entity: every artifact that links to it, upstream and
   * downstream. entityType: DRAWING | BOM | ROUTING | CHANGE | DOCUMENT.
   */
  async byEntity(entityType: string, entityId: string, tenantId?: string | null) {
    const tenantWhere = (tenantId ? { tenantId } : {}) as any;
    const type = entityType.toUpperCase();
    const links: Record<string, any> = { upstream: {}, downstream: {} };

    if (type === 'DRAWING') {
      const drawing = await this.drawingRepo.findOne({ where: { id: entityId, deletedAt: IsNull(), ...tenantWhere } });
      if (!drawing) throw new NotFoundException('Drawing not found');
      links.upstream = { projectId: drawing.projectId };
      links.downstream = {
        boms: await this.bomRepo.find({ where: { drawingId: entityId, deletedAt: IsNull(), ...tenantWhere } }),
        routings: await this.routingRepo.find({ where: { drawingId: entityId, deletedAt: IsNull(), ...tenantWhere } }),
        changes: await this.ecrRepo.find({ where: { drawingId: entityId, deletedAt: IsNull(), ...tenantWhere } }),
        reviews: await this.reviewRepo.find({ where: { entityType: 'DRAWING', entityId, deletedAt: IsNull(), ...tenantWhere } }),
        documents: await this.documentRepo.find({ where: { drawingId: entityId, deletedAt: IsNull(), ...tenantWhere } }),
      };
    } else if (type === 'BOM') {
      const bom = await this.bomRepo.findOne({ where: { id: entityId, deletedAt: IsNull(), ...tenantWhere } });
      if (!bom) throw new NotFoundException('BOM not found');
      links.upstream = { projectId: bom.projectId, drawingId: bom.drawingId };
      links.downstream = {
        routings: await this.routingRepo.find({ where: { bomId: entityId, deletedAt: IsNull(), ...tenantWhere } }),
        changes: await this.ecrRepo.find({ where: { bomId: entityId, deletedAt: IsNull(), ...tenantWhere } }),
        reviews: await this.reviewRepo.find({ where: { entityType: 'BOM', entityId, deletedAt: IsNull(), ...tenantWhere } }),
        documents: await this.documentRepo.find({ where: { bomId: entityId, deletedAt: IsNull(), ...tenantWhere } }),
      };
    } else if (type === 'ROUTING') {
      const routing = await this.routingRepo.findOne({ where: { id: entityId, deletedAt: IsNull(), ...tenantWhere } });
      if (!routing) throw new NotFoundException('Routing not found');
      links.upstream = { projectId: routing.projectId, drawingId: routing.drawingId, bomId: routing.bomId };
      links.downstream = {
        changes: await this.ecrRepo.find({ where: { routingId: entityId, deletedAt: IsNull(), ...tenantWhere } }),
        reviews: await this.reviewRepo.find({ where: { entityType: 'ROUTING', entityId, deletedAt: IsNull(), ...tenantWhere } }),
      };
    } else if (type === 'CHANGE') {
      const ecr = await this.ecrRepo.findOne({ where: { id: entityId, deletedAt: IsNull(), ...tenantWhere } });
      if (!ecr) throw new NotFoundException('Change request not found');
      const impacts = await this.impactRepo.find({ where: { ecrId: entityId, deletedAt: IsNull(), ...tenantWhere } });
      const orders = await this.ecoRepo.find({ where: { ecrId: entityId, deletedAt: IsNull(), ...tenantWhere } });
      const orderIds = orders.map((o) => o.id);
      const notices = orderIds.length
        ? await this.ecnRepo.find({ where: { ecoId: In(orderIds), deletedAt: IsNull(), ...tenantWhere } })
        : [];
      links.upstream = { projectId: ecr.projectId, drawingId: ecr.drawingId, bomId: ecr.bomId, workOrderId: ecr.workOrderId, routingId: ecr.routingId };
      links.downstream = { impacts, orders, notices };
    } else if (type === 'DOCUMENT') {
      const document = await this.documentRepo.findOne({ where: { id: entityId, deletedAt: IsNull(), ...tenantWhere } });
      if (!document) throw new NotFoundException('Document not found');
      links.upstream = { projectId: document.projectId, drawingId: document.drawingId, bomId: document.bomId };
      links.downstream = { reviews: await this.reviewRepo.find({ where: { entityType: 'DOCUMENT', entityId, deletedAt: IsNull(), ...tenantWhere } }) };
    } else {
      throw new NotFoundException(`Unsupported entityType: ${entityType}`);
    }

    return { entityType: type, entityId, links };
  }
}
