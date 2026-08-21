import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { AuditService } from '../../audit/services/audit.service';
import {
  G14LevelingRecommendation,
  RecommendationType,
  RecommendationStatus,
  LevelingRiskTier,
} from '../entities/g14-leveling-recommendation.entity';
import { Project } from '../../project/entities/project.entity';
import { ProjectMilestone } from '../../project/entities/projectmilestone.entity';
import { MachineMaster } from '../../machine/entities/machinemaster.entity';
import { WorkOrder } from '../../manufacturing/entities/workorder.entity';
import { G14DelayInferenceService } from './g14-delay-inference.service';
import { G14CapacityForecastService } from './g14-capacity-forecast.service';
import { G14ModelRegistryService } from './g14-model-registry.service';
import {
  GenerateLevelingRecommendationsDto,
  ReviewRecommendationDto,
  AcceptRecommendationDto,
  ModifyRecommendationDto,
  RejectRecommendationDto,
  ApplyRecommendationDto,
  CancelRecommendationDto,
  QueryRecommendationsDto,
  ProjectTimelineRiskSummary,
  MachineCapacityRiskSummary,
} from '../dto/g14-leveling.dto';

@Injectable()
export class G14TimelineLevelingService {
  private readonly logger = new Logger(G14TimelineLevelingService.name);

  constructor(
    @InjectRepository(G14LevelingRecommendation)
    private readonly recommendationRepository: Repository<G14LevelingRecommendation>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMilestone)
    private readonly milestoneRepository: Repository<ProjectMilestone>,
    @InjectRepository(MachineMaster)
    private readonly machineRepository: Repository<MachineMaster>,
    @InjectRepository(WorkOrder)
    private readonly workOrderRepository: Repository<WorkOrder>,
    private readonly delayInferenceService: G14DelayInferenceService,
    private readonly capacityForecastService: G14CapacityForecastService,
    private readonly modelRegistryService: G14ModelRegistryService,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  protected requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for leveling operations');
    }
    return tenantId;
  }

  /**
   * Aggregates project timeline risks combining M9.2 delay predictions with milestone telemetry.
   */
  async getProjectTimelineRisk(
    projectId: string,
    tenantId: string,
  ): Promise<ProjectTimelineRiskSummary> {
    const scopeTenant = this.requireTenant(tenantId);
    const project = await this.projectRepository.findOne({
      where: { id: projectId, tenantId: scopeTenant },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found for tenant.`);
    }

    const prediction = await this.delayInferenceService.predictProjectDelay(
      { projectId },
      scopeTenant,
    );

    let riskTier = LevelingRiskTier.LOW;
    if (prediction.predictedDelayDays > 10 && prediction.delayProbability > 0.75) {
      riskTier = LevelingRiskTier.CRITICAL;
    } else if (prediction.predictedDelayDays > 5 || prediction.delayProbability > 0.6) {
      riskTier = LevelingRiskTier.HIGH;
    } else if (prediction.predictedDelayDays > 2 || prediction.delayProbability > 0.3) {
      riskTier = LevelingRiskTier.MEDIUM;
    }

    const milestones = await this.milestoneRepository.find({
      where: { projectId, tenantId: scopeTenant },
    });

    const pendingRecs = await this.recommendationRepository.count({
      where: {
        projectId,
        tenantId: scopeTenant,
        status: RecommendationStatus.GENERATED,
        deletedAt: IsNull(),
      },
    });

    const contributingSignals = (prediction.explanation?.primaryContributors || []).map(
      (f) => `${f.featureName}: ${f.signalDirection}`,
    );

    return {
      projectId: project.id,
      projectName: project.name,
      riskTier,
      predictedDelayDays: prediction.predictedDelayDays,
      delayProbability: prediction.delayProbability,
      predictionInterval: {
        lower: prediction.lowerPredictionBound,
        upper: prediction.upperPredictionBound,
      },
      modelVersion: prediction.modelVersion,
      contributingSignals,
      activeMilestonesCount: milestones.length,
      criticalMilestonesAtRisk: milestones.filter((m: any) => m.status !== 'COMPLETED').length,
      recommendationsAvailable: pendingRecs,
    };
  }

  /**
   * Aggregates machine capacity risk combining M9.3 capacity deficit & overload forecasts.
   */
  async getMachineCapacityRisk(
    machineId: string,
    tenantId: string,
  ): Promise<MachineCapacityRiskSummary> {
    const scopeTenant = this.requireTenant(tenantId);
    const machine = await this.machineRepository.findOne({
      where: { id: machineId, tenantId: scopeTenant },
    });
    if (!machine) {
      throw new NotFoundException(`Machine ${machineId} not found for tenant.`);
    }

    const forecast = await this.capacityForecastService.predictCapacity(
      { machineId, forecastHorizonDays: 14 },
      scopeTenant,
    );

    let riskTier = LevelingRiskTier.LOW;
    if (forecast.explanation?.bottleneckRiskTier === 'CRITICAL') {
      riskTier = LevelingRiskTier.CRITICAL;
    } else if (forecast.explanation?.bottleneckRiskTier === 'HIGH') {
      riskTier = LevelingRiskTier.HIGH;
    } else if (forecast.explanation?.bottleneckRiskTier === 'MEDIUM') {
      riskTier = LevelingRiskTier.MEDIUM;
    }

    const pendingRecs = await this.recommendationRepository.count({
      where: {
        machineId,
        tenantId: scopeTenant,
        status: RecommendationStatus.GENERATED,
        deletedAt: IsNull(),
      },
    });

    const contributingSignals = (forecast.explanation?.primaryContributors || []).map(
      (s) => `${s.featureName}: ${s.signalDirection}`,
    );

    return {
      machineId: machine.id,
      machineName: forecast.machineName || `Machine #${machine.machineNumber}`,
      machineNumber: machine.machineNumber,
      riskTier,
      predictedUtilizationRatio: forecast.predictedUtilizationRatio,
      capacityDeficitHours: forecast.predictedDeficitHours,
      overloadProbability: forecast.overloadProbability,
      modelVersion: forecast.modelVersion,
      contributingSignals,
      queueDepthWorkOrders: 0,
      activeBookingsCount: 0,
      recommendationsAvailable: pendingRecs,
    };
  }

  /**
   * Generates advisory, explainable human-in-the-loop leveling recommendations.
   * STRICT BOUNDARY: Does NOT modify any project or machine schedules automatically.
   */
  async generateRecommendations(
    dto: GenerateLevelingRecommendationsDto,
    tenantId: string,
    actor?: string,
  ): Promise<G14LevelingRecommendation[]> {
    const scopeTenant = this.requireTenant(tenantId);
    const generated: G14LevelingRecommendation[] = [];
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry

    // 1. If Project ID provided or scanning projects
    if (dto.projectId) {
      const risk = await this.getProjectTimelineRisk(dto.projectId, scopeTenant);
      if (risk.predictedDelayDays > 1.0) {
        const milestones = await this.milestoneRepository.find({
          where: { projectId: dto.projectId, tenantId: scopeTenant },
        });

        const targetMilestone = milestones.find((m: any) => m.status !== 'COMPLETED') || milestones[0];

        const rec = this.recommendationRepository.create({
          tenantId: scopeTenant,
          recommendationType: RecommendationType.ADJUST_MILESTONE_DATE,
          capability: 'TIMELINE_LEVELING',
          projectId: dto.projectId,
          milestoneId: targetMilestone?.id || null,
          modelVersion: risk.modelVersion,
          riskTier: risk.riskTier,
          currentState: {
            predictedDelayDays: risk.predictedDelayDays,
            currentMilestonePlannedDate: targetMilestone?.plannedDate || new Date(),
          },
          proposedState: {
            recommendedDelayBufferDays: Math.ceil(risk.predictedDelayDays),
            suggestedMilestonePlannedDate: new Date(
              new Date(targetMilestone?.plannedDate || new Date()).getTime() +
                Math.ceil(risk.predictedDelayDays) * 86400000,
            ),
          },
          expectedBenefit: `Absorb ${Math.ceil(risk.predictedDelayDays)} days forecasted delay to protect downstream delivery commitments.`,
          predictedRiskBefore: {
            predictedDelayDays: risk.predictedDelayDays,
            delayProbability: risk.delayProbability,
          },
          predictedRiskAfter: {
            predictedDelayDays: 0,
            delayProbability: 0.15,
          },
          confidence: 0.88,
          uncertaintyLower: risk.predictionInterval.lower,
          uncertaintyUpper: risk.predictionInterval.upper,
          explanation: {
            contributingSignals: risk.contributingSignals,
            rationale: 'Project schedule exhibits high risk of slip based on historical telemetry.',
          },
          status: RecommendationStatus.GENERATED,
          expiresAt,
          createdBy: actor || 'SYSTEM',
        });

        const saved = await this.recommendationRepository.save(rec);
        generated.push(saved);

        await this.auditService.log({
          action: 'G14_LEVELING_RECOMMENDATION_GENERATED',
          entityType: 'G14LevelingRecommendation',
          entityId: saved.id,
          tenantId: scopeTenant,
          metadata: {
            recommendationType: saved.recommendationType,
            projectId: saved.projectId,
            actor,
          },
        });
      }
    }

    // 2. If Machine ID provided
    if (dto.machineId) {
      const capRisk = await this.getMachineCapacityRisk(dto.machineId, scopeTenant);
      if (capRisk.capacityDeficitHours > 0 || capRisk.overloadProbability > 0.5) {
        const rec = this.recommendationRepository.create({
          tenantId: scopeTenant,
          recommendationType: RecommendationType.ESCALATE_CAPACITY,
          capability: 'TIMELINE_LEVELING',
          machineId: dto.machineId,
          modelVersion: capRisk.modelVersion,
          riskTier: capRisk.riskTier,
          currentState: {
            capacityDeficitHours: capRisk.capacityDeficitHours,
            predictedUtilizationRatio: capRisk.predictedUtilizationRatio,
            overloadProbability: capRisk.overloadProbability,
          },
          proposedState: {
            recommendedCapacityAdditionHours: capRisk.capacityDeficitHours,
            suggestedAction: 'AUTHORIZE_OVERTIME_OR_OFFLOAD',
          },
          expectedBenefit: `Mitigate ${capRisk.capacityDeficitHours.toFixed(1)} hrs deficit to prevent work order queue accumulation.`,
          predictedRiskBefore: {
            capacityDeficitHours: capRisk.capacityDeficitHours,
            overloadProbability: capRisk.overloadProbability,
          },
          predictedRiskAfter: {
            capacityDeficitHours: 0,
            overloadProbability: 0.2,
          },
          confidence: 0.9,
          uncertaintyLower: Math.max(0, capRisk.capacityDeficitHours - 5),
          uncertaintyUpper: capRisk.capacityDeficitHours + 5,
          explanation: {
            contributingSignals: capRisk.contributingSignals,
            rationale: 'Work-center demand exceeds nominal availability over 14-day forecast window.',
          },
          status: RecommendationStatus.GENERATED,
          expiresAt,
          createdBy: actor || 'SYSTEM',
        });

        const saved = await this.recommendationRepository.save(rec);
        generated.push(saved);

        await this.auditService.log({
          action: 'G14_LEVELING_RECOMMENDATION_GENERATED',
          entityType: 'G14LevelingRecommendation',
          entityId: saved.id,
          tenantId: scopeTenant,
          metadata: {
            recommendationType: saved.recommendationType,
            machineId: saved.machineId,
            actor,
          },
        });
      }
    }

    return generated;
  }

  /**
   * Reviews a recommendation.
   */
  async reviewRecommendation(
    id: string,
    dto: ReviewRecommendationDto,
    tenantId: string,
    actor?: string,
  ): Promise<G14LevelingRecommendation> {
    const scopeTenant = this.requireTenant(tenantId);
    const rec = await this.getRecommendationById(id, scopeTenant);

    if (rec.status !== RecommendationStatus.GENERATED) {
      throw new BadRequestException(
        `Cannot review recommendation in status '${rec.status}'. Expected '${RecommendationStatus.GENERATED}'.`,
      );
    }

    rec.status = RecommendationStatus.UNDER_REVIEW;
    rec.reviewedBy = actor || 'PLANNER';
    rec.reviewedAt = new Date();
    rec.updatedBy = actor || 'SYSTEM';

    const saved = await this.recommendationRepository.save(rec);

    await this.auditService.log({
      action: 'G14_LEVELING_RECOMMENDATION_REVIEWED',
      entityType: 'G14LevelingRecommendation',
      entityId: rec.id,
      tenantId: scopeTenant,
      metadata: { actor, notes: dto.notes },
    });

    return saved;
  }

  /**
   * Accepts a recommendation.
   */
  async acceptRecommendation(
    id: string,
    dto: AcceptRecommendationDto,
    tenantId: string,
    actor?: string,
  ): Promise<G14LevelingRecommendation> {
    const scopeTenant = this.requireTenant(tenantId);
    const rec = await this.getRecommendationById(id, scopeTenant);

    if (
      rec.status !== RecommendationStatus.GENERATED &&
      rec.status !== RecommendationStatus.UNDER_REVIEW &&
      rec.status !== RecommendationStatus.MODIFIED
    ) {
      throw new BadRequestException(
        `Cannot accept recommendation in status '${rec.status}'.`,
      );
    }

    rec.status = RecommendationStatus.ACCEPTED;
    rec.reviewedBy = actor || 'PLANNER';
    rec.reviewedAt = new Date();
    rec.updatedBy = actor || 'SYSTEM';

    const saved = await this.recommendationRepository.save(rec);

    await this.auditService.log({
      action: 'G14_LEVELING_RECOMMENDATION_ACCEPTED',
      entityType: 'G14LevelingRecommendation',
      entityId: rec.id,
      tenantId: scopeTenant,
      metadata: { actor, notes: dto.notes },
    });

    return saved;
  }

  /**
   * Modifies a recommendation proposal while preserving AI lineage.
   */
  async modifyRecommendation(
    id: string,
    dto: ModifyRecommendationDto,
    tenantId: string,
    actor?: string,
  ): Promise<G14LevelingRecommendation> {
    const scopeTenant = this.requireTenant(tenantId);
    const rec = await this.getRecommendationById(id, scopeTenant);

    if (
      rec.status !== RecommendationStatus.GENERATED &&
      rec.status !== RecommendationStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException(
        `Cannot modify recommendation in status '${rec.status}'.`,
      );
    }

    rec.proposedState = {
      ...rec.proposedState,
      ...dto.proposedState,
      _originalAiProposal: rec.proposedState,
    };
    rec.modificationReason = dto.modificationReason;
    rec.status = RecommendationStatus.MODIFIED;
    rec.reviewedBy = actor || 'PLANNER';
    rec.reviewedAt = new Date();
    rec.updatedBy = actor || 'SYSTEM';

    const saved = await this.recommendationRepository.save(rec);

    await this.auditService.log({
      action: 'G14_LEVELING_RECOMMENDATION_MODIFIED',
      entityType: 'G14LevelingRecommendation',
      entityId: rec.id,
      tenantId: scopeTenant,
      metadata: { actor, modificationReason: dto.modificationReason },
    });

    return saved;
  }

  /**
   * Rejects a recommendation.
   */
  async rejectRecommendation(
    id: string,
    dto: RejectRecommendationDto,
    tenantId: string,
    actor?: string,
  ): Promise<G14LevelingRecommendation> {
    const scopeTenant = this.requireTenant(tenantId);
    const rec = await this.getRecommendationById(id, scopeTenant);

    if (
      rec.status !== RecommendationStatus.GENERATED &&
      rec.status !== RecommendationStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException(
        `Cannot reject recommendation in status '${rec.status}'.`,
      );
    }

    rec.rejectionReason = dto.rejectionReason;
    rec.status = RecommendationStatus.REJECTED;
    rec.reviewedBy = actor || 'PLANNER';
    rec.reviewedAt = new Date();
    rec.updatedBy = actor || 'SYSTEM';

    const saved = await this.recommendationRepository.save(rec);

    await this.auditService.log({
      action: 'G14_LEVELING_RECOMMENDATION_REJECTED',
      entityType: 'G14LevelingRecommendation',
      entityId: rec.id,
      tenantId: scopeTenant,
      metadata: { actor, rejectionReason: dto.rejectionReason },
    });

    return saved;
  }

  /**
   * Cancels a recommendation.
   */
  async cancelRecommendation(
    id: string,
    dto: CancelRecommendationDto,
    tenantId: string,
    actor?: string,
  ): Promise<G14LevelingRecommendation> {
    const scopeTenant = this.requireTenant(tenantId);
    const rec = await this.getRecommendationById(id, scopeTenant);

    if (rec.status === RecommendationStatus.APPLIED) {
      throw new BadRequestException(
        'Cannot cancel an already APPLIED recommendation.',
      );
    }

    rec.cancellationReason = dto.cancellationReason;
    rec.status = RecommendationStatus.CANCELLED;
    rec.updatedBy = actor || 'SYSTEM';

    const saved = await this.recommendationRepository.save(rec);

    await this.auditService.log({
      action: 'G14_LEVELING_RECOMMENDATION_CANCELLED',
      entityType: 'G14LevelingRecommendation',
      entityId: rec.id,
      tenantId: scopeTenant,
      metadata: { actor, cancellationReason: dto.cancellationReason },
    });

    return saved;
  }

  /**
   * Applies an ACCEPTED or MODIFIED recommendation transactionally with explicit human confirmation.
   */
  async applyRecommendation(
    id: string,
    dto: ApplyRecommendationDto,
    tenantId: string,
    actor?: string,
  ): Promise<G14LevelingRecommendation> {
    const scopeTenant = this.requireTenant(tenantId);

    if (!dto.confirmExecution) {
      throw new BadRequestException(
        'Explicit confirmation (confirmExecution = true) is required to apply timeline changes.',
      );
    }

    const rec = await this.getRecommendationById(id, scopeTenant);

    if (
      rec.status !== RecommendationStatus.ACCEPTED &&
      rec.status !== RecommendationStatus.MODIFIED
    ) {
      throw new BadRequestException(
        `Cannot apply recommendation in status '${rec.status}'. Must be ACCEPTED or MODIFIED.`,
      );
    }

    if (new Date() > new Date(rec.expiresAt)) {
      rec.status = RecommendationStatus.EXPIRED;
      await this.recommendationRepository.save(rec);
      throw new BadRequestException(
        'Recommendation has expired. Please generate a fresh recommendation.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      // If recommendation targets a milestone date adjustment, perform controlled update
      if (
        rec.recommendationType === RecommendationType.ADJUST_MILESTONE_DATE &&
        rec.milestoneId &&
        rec.proposedState?.suggestedMilestonePlannedDate
      ) {
        const milestone = await queryRunner.manager.findOne(ProjectMilestone, {
          where: { id: rec.milestoneId, tenantId: scopeTenant },
        });

        if (milestone) {
          milestone.plannedDate = new Date(
            rec.proposedState.suggestedMilestonePlannedDate,
          );
          milestone.updatedBy = actor || 'PLANNER';
          await queryRunner.manager.save(milestone);
        }
      }

      rec.status = RecommendationStatus.APPLIED;
      rec.appliedBy = actor || 'PLANNER';
      rec.appliedAt = new Date();
      rec.updatedBy = actor || 'SYSTEM';

      const applied = await queryRunner.manager.save(G14LevelingRecommendation, rec);

      await queryRunner.commitTransaction();

      await this.auditService.log({
        action: 'G14_LEVELING_RECOMMENDATION_APPLIED',
        entityType: 'G14LevelingRecommendation',
        entityId: applied.id,
        tenantId: scopeTenant,
        metadata: {
          actor,
          recommendationType: applied.recommendationType,
          projectId: applied.projectId,
          milestoneId: applied.milestoneId,
          machineId: applied.machineId,
        },
      });

      return applied;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Retrieves single recommendation by ID with tenant isolation.
   */
  async getRecommendationById(
    id: string,
    tenantId: string,
  ): Promise<G14LevelingRecommendation> {
    const scopeTenant = this.requireTenant(tenantId);
    const rec = await this.recommendationRepository.findOne({
      where: { id, tenantId: scopeTenant, deletedAt: IsNull() },
    });

    if (!rec) {
      throw new NotFoundException(
        `Recommendation ${id} not found for current tenant.`,
      );
    }
    return rec;
  }

  /**
   * Lists recommendations for tenant with optional filters.
   */
  async listRecommendations(
    query: QueryRecommendationsDto,
    tenantId: string,
  ): Promise<G14LevelingRecommendation[]> {
    const scopeTenant = this.requireTenant(tenantId);
    const where: any = { tenantId: scopeTenant, deletedAt: IsNull() };

    if (query.projectId) {
      where.projectId = query.projectId;
    }
    if (query.machineId) {
      where.machineId = query.machineId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.riskTier) {
      where.riskTier = query.riskTier;
    }

    return this.recommendationRepository.find({
      where,
      order: { generatedAt: 'DESC' },
    });
  }
}
