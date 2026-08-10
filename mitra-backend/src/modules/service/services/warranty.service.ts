import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceWarranty, ServiceWarrantyStatus } from '../entities/servicewarranty.entity';
import { ServiceWarrantyClaim, ServiceWarrantyClaimStatus } from '../entities/servicewarrantyclaim.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';

@Injectable()
export class WarrantyService extends TenantAwareService<ServiceWarranty> {
  constructor(
    @InjectRepository(ServiceWarranty)
    repo: Repository<ServiceWarranty>,
  ) {
    super(repo, 'ServiceWarranty');
  }

  determineEligibility(projectId?: string | null, dispatchId?: string | null): ServiceWarrantyStatus {
    if (!projectId || !dispatchId) return ServiceWarrantyStatus.EXPIRED;
    return ServiceWarrantyStatus.ACTIVE;
  }
}

@Injectable()
export class WarrantyClaimService extends TenantAwareService<ServiceWarrantyClaim> {
  constructor(
    @InjectRepository(ServiceWarrantyClaim)
    repo: Repository<ServiceWarrantyClaim>,
  ) {
    super(repo, 'ServiceWarrantyClaim');
  }

  async approve(id: string, userId?: string, tenantId?: string | null) {
    const claim = await this.findOne(id, tenantId);
    claim.status = ServiceWarrantyClaimStatus.APPROVED;
    claim.approvedBy = userId ?? null;
    claim.updatedBy = userId ?? null;
    return this.repo.save(claim);
  }
}
