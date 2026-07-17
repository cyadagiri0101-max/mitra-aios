import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { DispatchPlan } from '../entities/dispatchplan.entity';
import { CreateDispatchPlanDto, UpdateDispatchPlanDto } from '../dto/dispatch.dto';

@Injectable()
export class DispatchService {
  constructor(
    @InjectRepository(DispatchPlan)
    private readonly repo: Repository<DispatchPlan>,
  ) {}

  findAll(tenantId: string) {
    return this.repo.find({
      where: { tenantId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async findOne(id: string, tenantId: string) {
    const plan = await this.repo.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
    });
    if (!plan) throw new NotFoundException('Dispatch plan not found');
    return plan;
  }

  create(dto: CreateDispatchPlanDto, userId: string, tenantId: string) {
    const plan = this.repo.create({ ...dto, tenantId, createdBy: userId });
    return this.repo.save(plan);
  }

  async update(id: string, dto: UpdateDispatchPlanDto, userId: string, tenantId: string) {
    const plan = await this.findOne(id, tenantId);
    Object.assign(plan, dto, { updatedBy: userId });
    return this.repo.save(plan);
  }

  async remove(id: string, userId: string, tenantId: string) {
    const plan = await this.findOne(id, tenantId);
    plan.deletedAt  = new Date();
    plan.updatedBy  = userId;
    return this.repo.save(plan);
  }
}
