import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceAmcContract } from '../entities/serviceamc.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';

@Injectable()
export class AmcService extends TenantAwareService<ServiceAmcContract> {
  constructor(
    @InjectRepository(ServiceAmcContract)
    repo: Repository<ServiceAmcContract>,
  ) {
    super(repo, 'ServiceAmcContract');
  }

  async create(data: Record<string, unknown>, userId?: string, tenantId?: string | null) {
    const contractNumber = (data.contractNumber as string) ?? this.generateContractNumber();
    return super.create({ ...data, contractNumber }, userId, tenantId);
  }

  private generateContractNumber(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(Math.random() * 900 + 100);
    return `AMC-${ts}-${rand}`;
  }
}
