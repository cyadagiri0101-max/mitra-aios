import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceInstallation } from '../entities/serviceinstallation.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';

@Injectable()
export class InstallationService extends TenantAwareService<ServiceInstallation> {
  constructor(
    @InjectRepository(ServiceInstallation)
    repo: Repository<ServiceInstallation>,
  ) {
    super(repo, 'ServiceInstallation');
  }
}
