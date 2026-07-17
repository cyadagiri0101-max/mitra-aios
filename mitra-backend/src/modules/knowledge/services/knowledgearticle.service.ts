import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeArticle } from '../entities/knowledgearticle.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class KnowledgeArticleService extends TenantAwareService<KnowledgeArticle> {
  constructor(
    @InjectRepository(KnowledgeArticle)
    repo: Repository<KnowledgeArticle>,
  ) {
    super(repo, 'KnowledgeArticle');
  }
}