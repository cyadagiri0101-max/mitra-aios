import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { CustomerActivity, CustomerActivityType } from '../entities/customer-activity.entity';
import { CreateCustomerActivityDto } from '../dto/customer-activity.dto';

@Injectable()
export class CustomerActivityService {
  constructor(
    @InjectRepository(CustomerActivity)
    private readonly activityRepo: Repository<CustomerActivity>,
  ) {}

  async logActivity(
    customerId: string,
    activityType: CustomerActivityType,
    description: string,
    userId?: string,
    tenantId?: string | null,
    metadata?: Record<string, unknown>,
  ): Promise<CustomerActivity> {
    const activity = this.activityRepo.create({
      customerId,
      activityType,
      description,
      metadata: metadata ?? null,
      ...(tenantId ? { tenantId } : {}),
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as unknown as CustomerActivity);
    return this.activityRepo.save(activity);
  }

  async addActivity(customerId: string, dto: CreateCustomerActivityDto, userId?: string, tenantId?: string | null) {
    return this.logActivity(
      customerId,
      dto.activityType,
      dto.description,
      userId,
      tenantId,
      { referenceType: dto.referenceType ?? null, referenceId: dto.referenceId ?? null, ...(dto.metadata ?? {}) },
    );
  }

  async findActivities(customerId: string, tenantId?: string | null) {
    const where: any = { customerId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    return this.activityRepo.find({ where, order: { createdAt: 'DESC' }, take: 100 });
  }
}
