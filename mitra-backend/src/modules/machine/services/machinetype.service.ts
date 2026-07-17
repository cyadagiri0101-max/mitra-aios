import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MachineType } from '../entities/machinetype.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class MachineTypeService extends TenantAwareService<MachineType> {
  constructor(
    @InjectRepository(MachineType)
    repo: Repository<MachineType>,
  ) {
    super(repo, 'MachineType');
  }
}