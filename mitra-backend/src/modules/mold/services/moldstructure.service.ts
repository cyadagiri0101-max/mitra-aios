import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MoldStructure } from '../entities/moldstructure.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class MoldStructureService extends TenantAwareService<MoldStructure> {
  constructor(
    @InjectRepository(MoldStructure)
    repo: Repository<MoldStructure>,
  ) {
    super(repo, 'MoldStructure');
  }
}