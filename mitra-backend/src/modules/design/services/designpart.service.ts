import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DesignPart } from '../entities/designpart.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class DesignPartService extends TenantAwareService<DesignPart> {
  constructor(
    @InjectRepository(DesignPart)
    repo: Repository<DesignPart>,
  ) {
    super(repo, 'DesignPart');
  }
}