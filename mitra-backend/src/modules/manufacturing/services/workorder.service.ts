import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkOrder } from '../entities/workorder.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class WorkOrderService extends TenantAwareService<WorkOrder> {
  constructor(
    @InjectRepository(WorkOrder)
    repo: Repository<WorkOrder>,
  ) {
    super(repo, 'WorkOrder');
  }
}