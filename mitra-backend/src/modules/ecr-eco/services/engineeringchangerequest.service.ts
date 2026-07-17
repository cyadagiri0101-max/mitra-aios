import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EngineeringChangeRequest } from '../entities/engineeringchangerequest.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class EngineeringChangeRequestService extends TenantAwareService<EngineeringChangeRequest> {
  constructor(
    @InjectRepository(EngineeringChangeRequest)
    repo: Repository<EngineeringChangeRequest>,
  ) {
    super(repo, 'EngineeringChangeRequest');
  }
}