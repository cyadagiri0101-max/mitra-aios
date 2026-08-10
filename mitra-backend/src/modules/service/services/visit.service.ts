import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceVisit } from '../entities/servicevisit.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';

@Injectable()
export class VisitService extends TenantAwareService<ServiceVisit> {
  constructor(
    @InjectRepository(ServiceVisit)
    repo: Repository<ServiceVisit>,
  ) {
    super(repo, 'ServiceVisit');
  }
}
