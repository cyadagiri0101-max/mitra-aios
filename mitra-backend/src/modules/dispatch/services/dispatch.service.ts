import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { DispatchPlan, DispatchStatus } from '../entities/dispatchplan.entity';
import { CreateDispatchPlanDto, UpdateDispatchPlanDto, TransitionDispatchPlanDto } from '../dto/dispatch.dto';
import { OutboxService } from '../../platform/services/outbox.service';
import { EngineeringDomainEventType } from '../../engineering/events/engineering.events';
import { AuthUser } from '@common/decorators/current-user.decorator';

@Injectable()
export class DispatchService {
  constructor(
    @InjectRepository(DispatchPlan)
    private readonly repo: Repository<DispatchPlan>,
    private readonly outbox: OutboxService,
    private readonly dataSource: DataSource,
  ) {}

  findAll(tenantId: string) {
    return this.repo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async findOne(id: string, tenantId: string) {
    const plan = await this.repo.findOne({
      where: { id, tenantId },
    });
    if (!plan) throw new NotFoundException('Dispatch plan not found');
    return plan;
  }

  async create(dto: CreateDispatchPlanDto, userId: string, tenantId: string) {
    const dispatchNumber = dto.dispatchNumber ?? this.generateDispatchNumber();
    const plan = this.repo.create({
      ...dto,
      dispatchNumber,
      status: dto.status ?? DispatchStatus.PLANNING,
      tenantId,
      createdBy: userId,
    });
    const saved = await this.repo.save(plan);

    await this.outbox.append(
      EngineeringDomainEventType.DISPATCH_CREATED,
      'dispatch_plan',
      saved.id,
      {
        dispatchId: saved.id,
        dispatchNumber: saved.dispatchNumber,
        projectId: saved.projectId,
        customerName: saved.customerName,
      },
      { tenantId, actorId: userId },
    );

    return saved;
  }

  async update(id: string, dto: UpdateDispatchPlanDto, userId: string, tenantId: string) {
    const plan = await this.findOne(id, tenantId);
    Object.assign(plan, dto, { updatedBy: userId });
    return this.repo.save(plan);
  }

  async transition(id: string, user: AuthUser, dto: TransitionDispatchPlanDto) {
    const tenantId = user.tenantId ?? 'default';
    return this.dataSource.transaction(async (em) => {
      const plan = await em.getRepository(DispatchPlan).findOne({
        where: { id, tenantId },
      });
      if (!plan) throw new NotFoundException('Dispatch plan not found');

      const currentStatus = plan.status;
      const t = dto.transition;

      if (t === 'PACK') {
        if (currentStatus !== DispatchStatus.PLANNING) {
          throw new BadRequestException(`Cannot PACK dispatch from status '${currentStatus}'`);
        }
        plan.status = DispatchStatus.PACKED;
        if (dto.packingList) plan.packingList = dto.packingList;
        if (dto.notes) plan.notes = dto.notes;
        plan.updatedBy = user.id;

        const saved = await em.getRepository(DispatchPlan).save(plan);
        await this.outbox.append(
          EngineeringDomainEventType.DISPATCH_PACKED,
          'dispatch_plan',
          saved.id,
          { dispatchId: saved.id, dispatchNumber: saved.dispatchNumber, projectId: saved.projectId },
          { tenantId, actorId: user.id },
        );
        return saved;
      }

      if (t === 'SHIP') {
        if (currentStatus !== DispatchStatus.PACKED) {
          throw new BadRequestException(`Cannot SHIP dispatch from status '${currentStatus}' — dispatch must be PACKED first`);
        }
        const carrier = dto.carrier ?? plan.carrier;
        const trackingNumber = dto.trackingNumber ?? plan.trackingNumber;
        if (!carrier || !trackingNumber) {
          throw new BadRequestException('Carrier and tracking number are required to SHIP a dispatch');
        }
        plan.status = DispatchStatus.SHIPPED;
        plan.carrier = carrier;
        plan.trackingNumber = trackingNumber;
        plan.shippedDate = new Date();
        if (dto.notes) plan.notes = dto.notes;
        plan.updatedBy = user.id;

        const saved = await em.getRepository(DispatchPlan).save(plan);
        await this.outbox.append(
          EngineeringDomainEventType.DISPATCH_SHIPPED,
          'dispatch_plan',
          saved.id,
          { dispatchId: saved.id, dispatchNumber: saved.dispatchNumber, projectId: saved.projectId, carrier, trackingNumber },
          { tenantId, actorId: user.id },
        );
        return saved;
      }

      if (t === 'DELIVER') {
        if (currentStatus !== DispatchStatus.SHIPPED) {
          throw new BadRequestException(`Cannot DELIVER dispatch from status '${currentStatus}'`);
        }
        plan.status = DispatchStatus.DELIVERED;
        plan.deliveredDate = new Date();
        if (dto.notes) plan.notes = dto.notes;
        plan.updatedBy = user.id;

        const saved = await em.getRepository(DispatchPlan).save(plan);
        await this.outbox.append(
          EngineeringDomainEventType.DISPATCH_DELIVERED,
          'dispatch_plan',
          saved.id,
          { dispatchId: saved.id, dispatchNumber: saved.dispatchNumber, projectId: saved.projectId, deliveredDate: plan.deliveredDate },
          { tenantId, actorId: user.id },
        );
        return saved;
      }

      if (t === 'CANCEL') {
        if (currentStatus === DispatchStatus.DELIVERED) {
          throw new BadRequestException('Cannot CANCEL an already DELIVERED dispatch');
        }
        plan.status = DispatchStatus.CANCELLED;
        if (dto.notes) plan.notes = dto.notes;
        plan.updatedBy = user.id;

        const saved = await em.getRepository(DispatchPlan).save(plan);
        await this.outbox.append(
          EngineeringDomainEventType.DISPATCH_CANCELLED,
          'dispatch_plan',
          saved.id,
          { dispatchId: saved.id, dispatchNumber: saved.dispatchNumber, projectId: saved.projectId },
          { tenantId, actorId: user.id },
        );
        return saved;
      }

      throw new BadRequestException(`Unsupported dispatch transition: '${t}'`);
    });
  }

  async remove(id: string, userId: string, tenantId: string) {
    const plan = await this.findOne(id, tenantId);
    plan.deletedAt = new Date();
    plan.updatedBy = userId;
    return this.repo.save(plan);
  }

  private generateDispatchNumber(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(Math.random() * 900 + 100);
    return `DISP-${ts}-${rand}`;
  }
}
