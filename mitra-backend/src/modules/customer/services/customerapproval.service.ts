import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerApproval } from '../entities/customerapproval.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class CustomerApprovalService extends TenantAwareService<CustomerApproval> {
  constructor(
    @InjectRepository(CustomerApproval)
    repo: Repository<CustomerApproval>,
  ) {
    super(repo, 'CustomerApproval');
  }
}