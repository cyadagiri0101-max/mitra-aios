import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { Supplier } from '../entities/supplier.entity';

@Injectable()
export class SupplierService extends TenantAwareService<Supplier> {
  constructor(
    @InjectRepository(Supplier)
    repo: Repository<Supplier>,
  ) {
    super(repo, 'Supplier');
  }
}
