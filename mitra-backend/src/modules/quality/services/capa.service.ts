import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { CapaVerification } from '../entities/capaverification.entity';

@Injectable()
export class CapaService extends TenantAwareService<CapaVerification> {
  constructor(
    @InjectRepository(CapaVerification)
    repo: Repository<CapaVerification>,
  ) {
    super(repo, 'CAPA');
  }
}
