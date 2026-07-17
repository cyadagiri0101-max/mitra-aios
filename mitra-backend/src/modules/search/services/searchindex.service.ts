import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchIndex } from '../entities/searchindex.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class SearchIndexService extends TenantAwareService<SearchIndex> {
  constructor(
    @InjectRepository(SearchIndex)
    repo: Repository<SearchIndex>,
  ) {
    super(repo, 'SearchIndex');
  }
}