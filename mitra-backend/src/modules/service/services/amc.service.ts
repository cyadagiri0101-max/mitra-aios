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
}
