import { Injectable, ForbiddenException } from '@nestjs/common';
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

  private requireTenant(tenantId?: string | null): string {
    if (!tenantId || tenantId.trim() === '') {
      throw new ForbiddenException('Tenant context is required');
    }
    return tenantId;
  }

  async logActivity(
    customerId: string,
    activityType: CustomerActivityType,
    description: string,
    userId?: string,
    tenantId?: string | null,
    metadata?: Record<string, unknown>,
  ): Promise<CustomerActivity> {
    const scopeTenant = this.requireTenant(tenantId);
    const activity = this.activityRepo.create({
      customerId,
      activityType,
      description,
      metadata: metadata ?? null,
      tenantId: scopeTenant,
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as unknown as CustomerActivity);
    return this.activityRepo.save(activity);
  }

  async addActivity(customerId: string, dto: CreateCustomerActivityDto, userId?: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    return this.logActivity(
      customerId,
      dto.activityType,
      dto.description,
      userId,
      scopeTenant,
      { referenceType: dto.referenceType ?? null, referenceId: dto.referenceId ?? null, ...(dto.metadata ?? {}) },
    );
  }

  async findActivities(customerId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    return this.activityRepo.find({
      where: { customerId, deletedAt: IsNull(), tenantId: scopeTenant },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
