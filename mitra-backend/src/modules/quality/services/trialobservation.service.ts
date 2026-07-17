import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrialObservation } from '../entities/trialobservation.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class TrialObservationService extends TenantAwareService<TrialObservation> {
  constructor(
    @InjectRepository(TrialObservation)
    repo: Repository<TrialObservation>,
  ) {
    super(repo, 'TrialObservation');
  }
}