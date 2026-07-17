import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CPSReview } from '../entities/cpsreview.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class CpsReviewService extends TenantAwareService<CPSReview> {
  constructor(
    @InjectRepository(CPSReview)
    repo: Repository<CPSReview>,
  ) {
    super(repo, 'CPSReview');
  }
}