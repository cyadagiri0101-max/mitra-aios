import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { Product } from '../entities/product.entity';

@Injectable()
export class ProductService extends TenantAwareService<Product> {
  constructor(
    @InjectRepository(Product)
    repo: Repository<Product>,
  ) {
    super(repo, 'Product');
  }
}
