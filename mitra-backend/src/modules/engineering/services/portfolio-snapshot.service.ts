import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnterprisePortfolioSnapshot } from '../entities/enterprise-portfolio-snapshot.entity';
import { CrossProjectAllocation } from '../entities/cross-project-allocation.entity';
import { PortfolioDemandService } from './portfolio-demand.service';
import { PortfolioCapacityService } from './portfolio-capacity.service';
import { PortfolioBalancingService } from './portfolio-balancing.service';
import { OutboxService } from '../../platform/services/outbox.service';
import { EngineeringDomainEventType } from '../events/engineering.events';
import {
  CreateCrossProjectAllocationDto,
  UpdateAllocationStatusDto,
  CreatePortfolioSnapshotDto,
} from '../dto/portfolio-orchestration.dto';

export class CreateSnapshotInput {
  snapshotName?: string;
  projectIds?: string[];
  snapshotType?: 'SCHEDULED' | 'AD_HOC' | 'WHAT_IF_SCENARIO';
  actorId?: string;
}

@Injectable()
export class PortfolioSnapshotService {
  private readonly logger = new Logger(PortfolioSnapshotService.name);

  constructor(
    @InjectRepository(EnterprisePortfolioSnapshot)
    private readonly snapshotRepo: Repository<EnterprisePortfolioSnapshot>,
    @InjectRepository(CrossProjectAllocation)
    private readonly allocationRepo: Repository<CrossProjectAllocation>,
    private readonly demandService: PortfolioDemandService,
    private readonly capacityService: PortfolioCapacityService,
    private readonly balancingService: PortfolioBalancingService,
    private readonly outboxService: OutboxService,
  ) {}

  public async getLatestSnapshot(tenantId: string): Promise<EnterprisePortfolioSnapshot | null> {
    return this.snapshotRepo.findOne({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  public async createSnapshot(
    tenantId: string,
    input: CreateSnapshotInput,
  ): Promise<EnterprisePortfolioSnapshot> {
    this.logger.log(`Generating authoritative portfolio snapshot for tenant: ${tenantId}`);

    const demand = await this.demandService.calculatePortfolioDemand(tenantId, input.projectIds);
    const capacity = await this.capacityService.calculatePortfolioCapacity(tenantId);
    const balancing = await this.balancingService.analyzeAndBalance(tenantId);

    const snapshot = this.snapshotRepo.create({
      tenantId,
      snapshotName: input.snapshotName || `Portfolio Snapshot ${new Date().toISOString().slice(0, 10)}`,
      snapshotType: input.snapshotType || 'AD_HOC',
      includedProjectIds: demand.projects.map((p) => p.projectId),
      demandSummary: {
        totalDemandHours: demand.totalDemandHours,
        totalDeliverablesCount: demand.totalDeliverablesCount,
        activeProjectsCount: demand.activeProjectsCount,
        uncalibratedDeliverablesCount: demand.uncalibratedDeliverablesCount,
        projectBreakdown: demand.projects.map((p) => ({
          projectId: p.projectId,
          demandHours: p.estimatedTotalHours,
          deliverablesCount: p.totalDeliverablesCount,
          complexityTier: p.complexityTier,
        })),
      },
      capacitySummary: {
        totalAvailableCapacityHours: capacity.totalAvailableWeeklyCapacityHours,
        totalAllocatedCapacityHours: capacity.totalAllocatedWeeklyCapacityHours,
        overallUtilizationPercentage: capacity.overallUtilizationPercentage,
        totalEngineersCount: capacity.totalEngineersCount,
        overloadedEngineersCount: capacity.overloadedEngineersCount,
        underutilizedEngineersCount: capacity.underutilizedEngineersCount,
      },
      bottlenecks: balancing.bottlenecks,
      recommendations: balancing.recommendations,
      isAutonomousDecision: false,
      generatedBy: input.actorId || 'SYSTEM_USER',
    });

    const saved = await this.snapshotRepo.save(snapshot);

    try {
      await this.outboxService.append(
        EngineeringDomainEventType.PORTFOLIO_SNAPSHOT_CREATED,
        'enterprise_portfolio_snapshot',
        saved.id,
        {
          snapshotId: saved.id,
          snapshotName: saved.snapshotName,
          snapshotType: saved.snapshotType,
          includedProjectIds: saved.includedProjectIds,
          totalDemandHours: saved.demandSummary?.totalDemandHours || 0,
          totalCapacityHours: saved.capacitySummary?.totalAvailableCapacityHours || 0,
          overallUtilizationPercentage: saved.capacitySummary?.overallUtilizationPercentage || 0,
        },
        { tenantId, actorId: input.actorId || 'SYSTEM_USER' },
      );
    } catch (err) {
      this.logger.warn(`Failed to append outbox record for snapshot ${saved.id}: ${(err as Error)?.message}`);
    }

    return saved;
  }

  public async getCrossProjectAllocations(
    tenantId: string,
    projectId?: string,
    engineerId?: string,
  ): Promise<CrossProjectAllocation[]> {
    const qb = this.allocationRepo.createQueryBuilder('a')
      .where('a.tenant_id = :tenantId', { tenantId });

    if (projectId) {
      qb.andWhere('a.project_id = :projectId', { projectId });
    }
    if (engineerId) {
      qb.andWhere('a.engineer_id = :engineerId', { engineerId });
    }

    return qb.orderBy('a.created_at', 'DESC').getMany();
  }

  public async createAllocation(
    tenantId: string,
    dto: CreateCrossProjectAllocationDto,
    actorId?: string,
  ): Promise<CrossProjectAllocation> {
    this.logger.log(`Creating cross-project allocation for engineer: ${dto.engineerId} on project: ${dto.projectId}`);

    const allocation = this.allocationRepo.create({
      tenantId,
      projectId: dto.projectId,
      engineerId: dto.engineerId,
      engineerName: dto.engineerName || `Engineer ${dto.engineerId}`,
      workPackageId: dto.workPackageId,
      deliverableId: dto.deliverableId,
      allocationRole: dto.allocationRole,
      allocatedHoursPerWeek: dto.allocatedHoursPerWeek,
      allocatedWorkloadUnits: dto.allocatedWorkloadUnits || (dto.allocatedHoursPerWeek / 8.0),
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      allocationStatus: 'ACTIVE',
      skillFitScore: 100.0,
      source: 'MANUAL_ASSIGNMENT',
      reviewedBy: actorId || 'LEAD_PROJECT_MANAGER',
      reviewRationale: dto.reviewRationale || 'Human assigned via Portfolio Control Tower',
    });

    const saved = await this.allocationRepo.save(allocation);

    try {
      await this.outboxService.append(
        EngineeringDomainEventType.PORTFOLIO_ALLOCATION_CREATED,
        'cross_project_allocation',
        saved.id,
        {
          allocationId: saved.id,
          projectId: saved.projectId,
          engineerId: saved.engineerId,
          engineerName: saved.engineerName,
          allocationRole: saved.allocationRole,
          allocatedHoursPerWeek: saved.allocatedHoursPerWeek,
          startDate: saved.startDate,
          endDate: saved.endDate,
          allocationStatus: saved.allocationStatus,
          source: saved.source,
        },
        { tenantId, actorId: actorId || 'LEAD_PROJECT_MANAGER' },
      );
    } catch (err) {
      this.logger.warn(`Failed to append outbox record for allocation ${saved.id}: ${(err as Error)?.message}`);
    }

    return saved;
  }

  public async updateAllocationStatus(
    tenantId: string,
    allocationId: string,
    dto: UpdateAllocationStatusDto,
    actorId?: string,
  ): Promise<CrossProjectAllocation> {
    const allocation = await this.allocationRepo.findOne({
      where: { id: allocationId, tenantId },
    });

    if (!allocation) {
      throw new NotFoundException(`Allocation with ID ${allocationId} not found in tenant.`);
    }

    allocation.allocationStatus = dto.status;
    if (dto.rationale) {
      allocation.reviewRationale = dto.rationale;
    }
    allocation.reviewedBy = actorId || allocation.reviewedBy;

    const saved = await this.allocationRepo.save(allocation);

    try {
      await this.outboxService.append(
        EngineeringDomainEventType.PORTFOLIO_ALLOCATION_STATUS_UPDATED,
        'cross_project_allocation',
        saved.id,
        {
          allocationId: saved.id,
          projectId: saved.projectId,
          engineerId: saved.engineerId,
          allocationStatus: saved.allocationStatus,
          reviewRationale: saved.reviewRationale,
        },
        { tenantId, actorId: actorId || allocation.reviewedBy },
      );
    } catch (err) {
      this.logger.warn(`Failed to append outbox record for allocation status update ${saved.id}: ${(err as Error)?.message}`);
    }

    return saved;
  }
}

