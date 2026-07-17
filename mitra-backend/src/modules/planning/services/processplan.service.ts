import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessPlan } from '../entities/processplan.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class ProcessPlanService extends TenantAwareService<ProcessPlan> {
  constructor(
    @InjectRepository(ProcessPlan)
    repo: Repository<ProcessPlan>,
  ) {
    super(repo, 'ProcessPlan');
  }
}