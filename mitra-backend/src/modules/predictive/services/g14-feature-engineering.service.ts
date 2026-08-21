import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { AuditService } from '../../audit/services/audit.service';
import { G14TelemetryService } from './g14-telemetry.service';
import { G14FeatureSnapshot } from '../entities/g14-feature-snapshot.entity';
import { MilestoneStatus } from '../../project/entities/projectmilestone.entity';
import { NcrSeverity, NcrStatus } from '../../quality/entities/ncr-record.entity';
import { TrialResult } from '../../quality/entities/trialobservation.entity';
import {
  ExtractFeaturesDto,
  QueryFeatureSnapshotsDto,
  G14FeatureVector,
  G14FeatureMetadata,
  G14PredictionTarget,
} from '../dto/g14-feature.dto';

export const G14_CURRENT_FEATURE_VERSION = 'G14_FEATURES_V1';

@Injectable()
export class G14FeatureEngineeringService {
  private readonly logger = new Logger(G14FeatureEngineeringService.name);

  constructor(
    private readonly telemetryService: G14TelemetryService,
    @InjectRepository(G14FeatureSnapshot)
    private readonly snapshotRepository: Repository<G14FeatureSnapshot>,
    private readonly auditService: AuditService,
  ) {}

  protected requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for feature operations');
    }
    return tenantId;
  }

  /**
   * Extracts and engineers standardized G14 features for a project at a given temporal cutoff.
   */
  async extractProjectFeatures(
    dto: ExtractFeaturesDto,
    tenantId: string,
  ): Promise<{
    snapshot?: G14FeatureSnapshot;
    featureVector: G14FeatureVector;
    featureMetadata: G14FeatureMetadata;
    groundTruthTarget?: G14PredictionTarget | null;
  }> {
    const scopeTenant = this.requireTenant(tenantId);
    const cutoff = dto.predictionCutoff ? new Date(dto.predictionCutoff) : new Date();
    const featureVersion = dto.featureVersion || G14_CURRENT_FEATURE_VERSION;

    if (featureVersion !== G14_CURRENT_FEATURE_VERSION) {
      throw new BadRequestException(
        `Unsupported feature version: ${featureVersion}. Current supported version is ${G14_CURRENT_FEATURE_VERSION}.`,
      );
    }

    // 1. Authoritative telemetry extraction (leakage-safe)
    const telemetry = await this.telemetryService.extractAuthoritativeTelemetry(
      dto.projectId,
      scopeTenant,
      cutoff,
    );

    const { project, milestones, baselines, workOrders, ncrs, trials, designLoads } =
      telemetry;

    // 2. Feature Engineering: Project Family
    const projectCreatedAt = new Date(project.createdAt);
    const projectAgeDays = Math.max(
      0,
      Math.floor((cutoff.getTime() - projectCreatedAt.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const totalMilestonesCount = milestones.length;
    const completedMilestones = milestones.filter(
      (m) =>
        m.status === MilestoneStatus.COMPLETED &&
        m.actualDate &&
        new Date(m.actualDate) <= cutoff,
    );
    const completedMilestonesCount = completedMilestones.length;
    const milestoneCompletionRatio =
      totalMilestonesCount > 0 ? completedMilestonesCount / totalMilestonesCount : 0;

    let cumulativeScheduleVarianceDays = 0;
    let overdueMilestonesCount = 0;

    for (const m of milestones) {
      const plannedDate = m.plannedDate ? new Date(m.plannedDate) : null;
      const actualDate = m.actualDate ? new Date(m.actualDate) : null;

      if (actualDate && actualDate <= cutoff && plannedDate) {
        const variance = Math.floor(
          (actualDate.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        cumulativeScheduleVarianceDays += variance;
      } else if (!actualDate && plannedDate && plannedDate < cutoff) {
        overdueMilestonesCount++;
        const overdueDays = Math.floor(
          (cutoff.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        cumulativeScheduleVarianceDays += overdueDays;
      }
    }

    const plannedEndDate = project.targetDeliveryDate ? new Date(project.targetDeliveryDate) : null;
    const remainingPlannedDurationDays = plannedEndDate
      ? Math.max(0, Math.floor((plannedEndDate.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    // 3. Feature Engineering: Execution Family
    const totalWorkOrdersCount = workOrders.length;
    const completedWorkOrders = workOrders.filter(
      (w) =>
        w.status === 'COMPLETED' &&
        w.actualEndDate &&
        new Date(w.actualEndDate) <= cutoff,
    );
    const completedWorkOrdersCount = completedWorkOrders.length;
    const workOrderCompletionRatio =
      totalWorkOrdersCount > 0 ? completedWorkOrdersCount / totalWorkOrdersCount : 0;

    let cumulativeWorkOrderDelayDays = 0;
    for (const w of workOrders) {
      const pEnd = w.plannedEndDate ? new Date(w.plannedEndDate) : null;
      const aEnd = w.actualEndDate ? new Date(w.actualEndDate) : null;
      if (aEnd && aEnd <= cutoff && pEnd) {
        cumulativeWorkOrderDelayDays += Math.max(
          0,
          Math.floor((aEnd.getTime() - pEnd.getTime()) / (1000 * 60 * 60 * 24)),
        );
      }
    }

    const totalTrialsCount = trials.length;
    const failedTrialsCount = trials.filter((t) => t.result === TrialResult.FAIL).length;
    const trialFailureRate =
      totalTrialsCount > 0 ? failedTrialsCount / totalTrialsCount : 0;

    // 4. Feature Engineering: Capacity Family
    let totalDemandHours = 0;
    let availableCapacityHours = 0;
    for (const d of designLoads) {
      totalDemandHours += Number(d.plannedHours || 0);
      availableCapacityHours += Number(d.standardHours || d.plannedHours || 0);
    }
    const capacityGapHours = Math.max(0, totalDemandHours - availableCapacityHours);
    const averageUtilizationPct =
      availableCapacityHours > 0
        ? Math.min(200, (totalDemandHours / availableCapacityHours) * 100)
        : totalDemandHours > 0
        ? 100
        : 0;
    const isOverloaded = totalDemandHours > availableCapacityHours;

    // 5. Feature Engineering: Quality Family
    const totalNcrCount = ncrs.length;
    const openNcrCount = ncrs.filter((n) => n.status !== NcrStatus.CLOSED).length;
    const criticalNcrCount = ncrs.filter((n) => n.severity === NcrSeverity.CRITICAL).length;
    const capaCount = ncrs.filter((n) => n.severity === NcrSeverity.MAJOR || n.severity === NcrSeverity.CRITICAL).length;
    const reworkFrequency = totalWorkOrdersCount > 0 ? totalNcrCount / totalWorkOrdersCount : 0;

    // 6. Feature Engineering: Dependency & Temporal Families
    const blockedMilestonesCount = milestones.filter((m) => m.status === MilestoneStatus.DELAYED).length;
    const maxPredecessorVarianceDays = Math.max(0, ...milestones.map((m) => m.daysVariance || 0));

    const startDate = project.enquiryDate ? new Date(project.enquiryDate) : projectCreatedAt;
    const projectDurationDays = plannedEndDate
      ? Math.max(1, Math.floor((plannedEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 1;
    const elapsedProjectDays = Math.max(
      0,
      Math.floor((cutoff.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const timeElapsedRatio = Math.min(2.0, elapsedProjectDays / projectDurationDays);

    // 7. Assemble Dense Feature Vector (20 dimensions)
    const denseVector: number[] = [
      projectAgeDays / 365,
      milestoneCompletionRatio,
      cumulativeScheduleVarianceDays / 30,
      overdueMilestonesCount,
      remainingPlannedDurationDays / 365,
      totalWorkOrdersCount,
      workOrderCompletionRatio,
      cumulativeWorkOrderDelayDays / 30,
      totalTrialsCount,
      trialFailureRate,
      totalDemandHours / 1000,
      availableCapacityHours / 1000,
      capacityGapHours / 500,
      averageUtilizationPct / 100,
      isOverloaded ? 1 : 0,
      totalNcrCount,
      openNcrCount,
      criticalNcrCount,
      blockedMilestonesCount,
      timeElapsedRatio,
    ];

    const featureVector: G14FeatureVector = {
      project: {
        projectAgeDays,
        totalMilestonesCount,
        completedMilestonesCount,
        milestoneCompletionRatio,
        cumulativeScheduleVarianceDays,
        overdueMilestonesCount,
        remainingPlannedDurationDays,
      },
      execution: {
        totalWorkOrdersCount,
        completedWorkOrdersCount,
        workOrderCompletionRatio,
        cumulativeWorkOrderDelayDays,
        totalTrialsCount,
        failedTrialsCount,
        trialFailureRate,
      },
      capacity: {
        totalDemandHours,
        availableCapacityHours,
        capacityGapHours,
        averageUtilizationPct,
        isOverloaded,
      },
      quality: {
        totalNcrCount,
        openNcrCount,
        criticalNcrCount,
        capaCount,
        reworkFrequency,
      },
      dependency: {
        blockedMilestonesCount,
        maxPredecessorVarianceDays,
      },
      temporal: {
        elapsedProjectDays,
        projectDurationDays,
        timeElapsedRatio,
      },
      denseVector,
    };

    const featureMetadata: G14FeatureMetadata = {
      extractedAt: new Date().toISOString(),
      predictionCutoff: cutoff.toISOString(),
      featureVersion,
      sourceCounts: {
        milestones: milestones.length,
        baselines: baselines.length,
        workOrders: workOrders.length,
        ncrs: ncrs.length,
        trials: trials.length,
        designLoads: designLoads.length,
      },
      dataQuality: {
        hasMissingBaselines: baselines.length === 0,
        hasNegativeDurationsSanitized: true,
        excludedFutureEventsCount:
          telemetry.futureExcludedCounts.milestones +
          telemetry.futureExcludedCounts.workOrders +
          telemetry.futureExcludedCounts.ncrs +
          telemetry.futureExcludedCounts.trials,
      },
    };

    // 8. Compute Ground Truth Target if requested
    let groundTruthTarget: G14PredictionTarget | null = null;
    if (dto.computeGroundTruthTarget) {
      const actualEnd = project.dispatchedAt ? new Date(project.dispatchedAt) : null;
      let projectDelayDays = 0;
      if (actualEnd && plannedEndDate) {
        projectDelayDays = Math.floor(
          (actualEnd.getTime() - plannedEndDate.getTime()) / (1000 * 60 * 60 * 24),
        );
      } else {
        projectDelayDays = cumulativeScheduleVarianceDays;
      }

      groundTruthTarget = {
        projectDelayDays,
        isDelayed: projectDelayDays > 0,
        milestoneDelays: milestones.map((m) => ({
          milestoneId: m.id,
          title: m.milestoneName,
          varianceDays: m.plannedDate && m.actualDate
            ? Math.floor(
                (new Date(m.actualDate).getTime() -
                  new Date(m.plannedDate).getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : m.daysVariance || 0,
        })),
        capacityRiskScore: totalDemandHours > 0
          ? Math.min(1.0, Math.max(0.0, capacityGapHours / totalDemandHours))
          : 0,
      };
    }

    // 9. Persist Snapshot if requested
    let snapshot: G14FeatureSnapshot | undefined;
    if (dto.persistSnapshot !== false) {
      let existing = await this.snapshotRepository.findOne({
        where: {
          tenantId: scopeTenant,
          projectId: dto.projectId,
          predictionCutoff: cutoff,
          featureVersion,
          deletedAt: IsNull(),
        },
      });

      if (existing) {
        existing.featureVector = featureVector;
        existing.featureMetadata = featureMetadata;
        existing.groundTruthTarget = groundTruthTarget;
        existing.sourceRecordsHash = telemetry.sourceHash;
        snapshot = await this.snapshotRepository.save(existing);
      } else {
        snapshot = await this.snapshotRepository.save({
          tenantId: scopeTenant,
          projectId: dto.projectId,
          predictionCutoff: cutoff,
          featureVersion,
          featureVector,
          featureMetadata,
          groundTruthTarget,
          sourceRecordsHash: telemetry.sourceHash,
        });
      }

      await this.auditService.log({
        action: 'G14_FEATURE_SNAPSHOT_EXTRACTED',
        entityType: 'G14FeatureSnapshot',
        entityId: snapshot.id,
        tenantId: scopeTenant,
        projectId: dto.projectId,
        metadata: {
          cutoff: cutoff.toISOString(),
          featureVersion,
          sourceHash: telemetry.sourceHash,
        },
      });
    }

    return {
      snapshot,
      featureVector,
      featureMetadata,
      groundTruthTarget,
    };
  }

  /**
   * Queries existing feature snapshots with tenant isolation.
   */
  async queryFeatureSnapshots(
    dto: QueryFeatureSnapshotsDto,
    tenantId: string,
  ): Promise<{ items: G14FeatureSnapshot[]; total: number }> {
    const scopeTenant = this.requireTenant(tenantId);
    const qb = this.snapshotRepository
      .createQueryBuilder('snapshot')
      .where('snapshot.tenantId = :tenantId', { tenantId: scopeTenant })
      .andWhere('snapshot.deletedAt IS NULL');

    if (dto.projectId) {
      qb.andWhere('snapshot.projectId = :projectId', { projectId: dto.projectId });
    }
    if (dto.featureVersion) {
      qb.andWhere('snapshot.featureVersion = :featureVersion', {
        featureVersion: dto.featureVersion,
      });
    }
    if (dto.fromDate) {
      qb.andWhere('snapshot.predictionCutoff >= :fromDate', {
        fromDate: new Date(dto.fromDate),
      });
    }
    if (dto.toDate) {
      qb.andWhere('snapshot.predictionCutoff <= :toDate', {
        toDate: new Date(dto.toDate),
      });
    }

    const [items, total] = await qb
      .orderBy('snapshot.predictionCutoff', 'DESC')
      .skip(dto.offset || 0)
      .take(dto.limit || 50)
      .getManyAndCount();

    return { items, total };
  }
}
