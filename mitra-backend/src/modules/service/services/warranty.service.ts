import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { ServiceWarranty, ServiceWarrantyStatus } from '../entities/servicewarranty.entity';
import { ServiceWarrantyClaim, ServiceWarrantyClaimStatus } from '../entities/servicewarrantyclaim.entity';
import { ServiceRequest, ServiceRequestStatus } from '../entities/servicerequest.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { OutboxService } from '../../platform/services/outbox.service';
import { EngineeringDomainEventType } from '../../engineering/events/engineering.events';
import { AuthUser } from '@common/decorators/current-user.decorator';

@Injectable()
export class WarrantyService extends TenantAwareService<ServiceWarranty> {
  constructor(
    @InjectRepository(ServiceWarranty)
    repo: Repository<ServiceWarranty>,
    private readonly outbox: OutboxService,
  ) {
    super(repo, 'ServiceWarranty');
  }

  async create(data: Record<string, unknown>, userId?: string, tenantId?: string | null) {
    const warrantyNumber = (data.warrantyNumber as string) ?? this.generateWarrantyNumber();
    const startDate = data.warrantyStartDate ? new Date(data.warrantyStartDate as string) : new Date();
    const coverageMonths = Number(data.coverageMonths ?? 12);
    const endDate = data.warrantyEndDate
      ? new Date(data.warrantyEndDate as string)
      : new Date(new Date(startDate).setMonth(startDate.getMonth() + coverageMonths));
    const maxCycles = Number(data.maxCycles ?? 500000);

    if (endDate <= startDate) {
      throw new BadRequestException('Warranty end date must be after start date');
    }

    const entity = await super.create(
      {
        ...data,
        warrantyNumber,
        warrantyStartDate: startDate,
        warrantyEndDate: endDate,
        coverageMonths,
        maxCycles,
        currentCycles: Number(data.currentCycles ?? 0),
        coverageTerms: data.coverageTerms ?? 'Standard 12-month / 500,000-cycle comprehensive tooling warranty',
        status: data.status ?? ServiceWarrantyStatus.ACTIVE,
      },
      userId,
      tenantId,
    );

    await this.outbox.append(
      EngineeringDomainEventType.SERVICE_WARRANTY_ACTIVATED,
      'service_warranty',
      entity.id,
      {
        warrantyId: entity.id,
        warrantyNumber: entity.warrantyNumber,
        projectId: entity.projectId,
      },
      { tenantId: tenantId ?? undefined, actorId: userId ?? undefined },
    );

    return entity;
  }

  async checkCoverage(id: string, incidentDateStr?: string, tenantId?: string | null) {
    const warranty = await this.findOne(id, tenantId);
    if (warranty.status !== ServiceWarrantyStatus.ACTIVE) {
      return { isCovered: false, reason: `Warranty status is ${warranty.status}` };
    }

    const incidentDate = incidentDateStr ? new Date(incidentDateStr) : new Date();
    if (warranty.warrantyStartDate && incidentDate < new Date(warranty.warrantyStartDate)) {
      return { isCovered: false, reason: 'Incident date precedes warranty start date' };
    }

    if (warranty.warrantyEndDate && incidentDate > new Date(warranty.warrantyEndDate)) {
      return { isCovered: false, reason: 'Incident date exceeds warranty expiration date' };
    }

    if (warranty.maxCycles != null && warranty.currentCycles != null && warranty.currentCycles > warranty.maxCycles) {
      return { isCovered: false, reason: 'Warranty cycle limit exhausted' };
    }

    return { isCovered: true, warranty };
  }

  determineEligibility(projectId?: string | null, dispatchId?: string | null): ServiceWarrantyStatus {
    if (!projectId || !dispatchId) return ServiceWarrantyStatus.EXPIRED;
    return ServiceWarrantyStatus.ACTIVE;
  }

  private generateWarrantyNumber(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(Math.random() * 900 + 100);
    return `WAR-${ts}-${rand}`;
  }
}

@Injectable()
export class WarrantyClaimService extends TenantAwareService<ServiceWarrantyClaim> {
  constructor(
    @InjectRepository(ServiceWarrantyClaim)
    repo: Repository<ServiceWarrantyClaim>,
    @InjectRepository(ServiceWarranty)
    private readonly warrantyRepo: Repository<ServiceWarranty>,
    @InjectRepository(ServiceRequest)
    private readonly requestRepo: Repository<ServiceRequest>,
    private readonly outbox: OutboxService,
    private readonly dataSource: DataSource,
  ) {
    super(repo, 'ServiceWarrantyClaim');
  }

  async create(data: Record<string, unknown>, userId?: string, tenantId?: string | null) {
    const claimNumber = (data.claimNumber as string) ?? this.generateClaimNumber();
    return super.create({ ...data, claimNumber }, userId, tenantId);
  }

  async adjudicate(
    id: string,
    user: AuthUser,
    dto: {
      decision: 'APPROVE' | 'REJECT';
      approvalNotes?: string;
      rejectionReason?: string;
      resolutionNotes?: string;
      approvedAmount?: number;
    },
  ) {
    const tenantId = user.tenantId ?? undefined;
    return this.dataSource.transaction(async (em) => {
      const claim = await em.getRepository(ServiceWarrantyClaim).findOne({
        where: { id, ...(tenantId ? { tenantId } : {}) },
      });
      if (!claim) throw new NotFoundException('Warranty claim not found');

      if (claim.status === ServiceWarrantyClaimStatus.APPROVED || claim.status === ServiceWarrantyClaimStatus.REJECTED) {
        throw new BadRequestException(`Claim has already been adjudicated as '${claim.status}'`);
      }

      if (dto.decision === 'APPROVE') {
        if (!claim.warrantyId) {
          throw new BadRequestException('Cannot approve claim without a linked warranty');
        }
        const warranty = await em.getRepository(ServiceWarranty).findOne({
          where: { id: claim.warrantyId, ...(tenantId ? { tenantId } : {}) },
        });
        if (!warranty) {
          throw new NotFoundException('Linked warranty not found');
        }
        if (warranty.status !== ServiceWarrantyStatus.ACTIVE) {
          throw new BadRequestException(`Cannot approve claim: Linked warranty status is '${warranty.status}'`);
        }

        const incidentDate = claim.claimDate ? new Date(claim.claimDate) : new Date();
        if (warranty.warrantyStartDate && incidentDate < new Date(warranty.warrantyStartDate)) {
          throw new BadRequestException('Cannot approve claim: incident date precedes warranty start date');
        }
        if (warranty.warrantyEndDate && incidentDate > new Date(warranty.warrantyEndDate)) {
          throw new BadRequestException('Cannot approve claim: incident date exceeds warranty expiration date');
        }
        if (warranty.maxCycles != null && warranty.currentCycles != null && warranty.currentCycles > warranty.maxCycles) {
          throw new BadRequestException('Cannot approve claim: warranty cycle limit exhausted');
        }

        if (claim.serviceRequestId) {
          const req = await em.getRepository(ServiceRequest).findOne({
            where: { id: claim.serviceRequestId, ...(tenantId ? { tenantId } : {}) },
          });
          if (!req) {
            throw new NotFoundException('Linked service request not found');
          }
          if (req.projectId && claim.projectId && req.projectId !== claim.projectId) {
            throw new BadRequestException('Cannot approve claim: linked service request belongs to a different project');
          }
        }

        const claimAmount = Number(claim.claimAmount ?? 0);
        if (!(claimAmount > 0)) {
          throw new BadRequestException('Cannot approve claim: claim has no valid financial data (claimAmount > 0 required)');
        }

        claim.status = ServiceWarrantyClaimStatus.APPROVED;
        claim.approvedBy = user.id;
        claim.approvalNotes = dto.approvalNotes ?? 'Warranty claim approved';
        claim.approvedAmount = Number(dto.approvedAmount ?? claimAmount);
        claim.resolvedDate = new Date();
        claim.updatedBy = user.id;

        const savedClaim = await em.getRepository(ServiceWarrantyClaim).save(claim);

        // Synchronize linked Service Request to RESOLVED
        let updatedRequest: ServiceRequest | null = null;
        if (claim.serviceRequestId) {
          const req = await em.getRepository(ServiceRequest).findOne({
            where: { id: claim.serviceRequestId, ...(tenantId ? { tenantId } : {}) },
          });
          if (req && req.status !== ServiceRequestStatus.CLOSED) {
            req.status = ServiceRequestStatus.RESOLVED;
            req.resolutionSummary = dto.resolutionNotes ?? 'Resolved via approved warranty claim';
            req.updatedBy = user.id;
            updatedRequest = await em.getRepository(ServiceRequest).save(req);
          }
        }

        await this.outbox.append(
          EngineeringDomainEventType.SERVICE_WARRANTY_CLAIM_ADJUDICATED,
          'service_warranty_claim',
          savedClaim.id,
          {
            claimId: savedClaim.id,
            claimNumber: savedClaim.claimNumber,
            decision: 'APPROVE',
            warrantyId: savedClaim.warrantyId,
            serviceRequestId: savedClaim.serviceRequestId,
          },
          { tenantId: tenantId ?? undefined, actorId: user.id },
        );

        return { claim: savedClaim, request: updatedRequest };
      }

      if (dto.decision === 'REJECT') {
        if (!dto.rejectionReason) {
          throw new BadRequestException('Rejection reason is mandatory to REJECT a warranty claim');
        }
        claim.status = ServiceWarrantyClaimStatus.REJECTED;
        claim.eligibilityReason = dto.rejectionReason ?? 'Claim rejected during adjudication';
        claim.approvalNotes = dto.approvalNotes ?? dto.rejectionReason ?? 'Claim rejected during adjudication';
        claim.resolvedDate = new Date();
        claim.updatedBy = user.id;

        const savedClaim = await em.getRepository(ServiceWarrantyClaim).save(claim);

        await this.outbox.append(
          EngineeringDomainEventType.SERVICE_WARRANTY_CLAIM_ADJUDICATED,
          'service_warranty_claim',
          savedClaim.id,
          {
            claimId: savedClaim.id,
            claimNumber: savedClaim.claimNumber,
            decision: 'REJECT',
            rejectionReason: claim.eligibilityReason,
          },
          { tenantId: tenantId ?? undefined, actorId: user.id },
        );

        return { claim: savedClaim, request: null };
      }

      throw new BadRequestException(`Invalid claim decision: '${dto.decision}'`);
    });
  }

  async approve(id: string, userId?: string, tenantId?: string | null) {
    return this.adjudicate(id, { id: userId ?? 'system', tenantId: tenantId ?? undefined } as AuthUser, {
      decision: 'APPROVE',
      approvalNotes: 'Approved via legacy approve API',
    });
  }

  private generateClaimNumber(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(Math.random() * 900 + 100);
    return `CLM-${ts}-${rand}`;
  }
}
