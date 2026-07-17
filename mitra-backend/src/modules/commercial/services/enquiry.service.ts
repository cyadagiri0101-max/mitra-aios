import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enquiry } from '../entities/enquiry.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class EnquiryService extends TenantAwareService<Enquiry> {
  constructor(
    @InjectRepository(Enquiry)
    repo: Repository<Enquiry>,
  ) {
    super(repo, 'Enquiry');
  }
}