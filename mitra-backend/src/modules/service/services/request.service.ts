import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceRequest } from '../entities/servicerequest.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class ServiceRequestService extends TenantAwareService<ServiceRequest> {
  constructor(
    @InjectRepository(ServiceRequest)
    repo: Repository<ServiceRequest>,
  ) {
    super(repo, 'ServiceRequest');
  }
}