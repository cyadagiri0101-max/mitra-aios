import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentVersion } from '../entities/documentversion.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class DocumentVersionService extends TenantAwareService<DocumentVersion> {
  constructor(
    @InjectRepository(DocumentVersion)
    repo: Repository<DocumentVersion>,
  ) {
    super(repo, 'DocumentVersion');
  }
}