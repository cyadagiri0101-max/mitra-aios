import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OperationalRecommendation,
  OperationalRecommendationType,
  OperationalRecommendationStatus,
} from '../entities/operational-recommendation.entity';
import { ManufacturingSignal, ManufacturingSignalType } from '../entities/manufacturing-signal.entity';
import { ManufacturingObservation } from '../entities/manufacturing-observation.entity';
import { WorkOrder, WorkOrderStatus } from '../entities/workorder.entity';
import { AuditService } from '../../audit/services/audit.service';
import {
  ReviewRecommendationDto,
  OperationalStateSummary,
} from '../dto/manufacturing-telemetry.dto';

@Injectable()
export class OperationalClosedLoopService {
  private readonly logger = new Logger(OperationalClosedLoopService.name);

  constructor(
    @InjectRepository(OperationalRecommendation)
    private readonly recommendationRepo: Repository<OperationalRecommendation>,
    @InjectRepository(ManufacturingSignal)
    private readonly signalRepo: Repository<ManufacturingSignal>,
    @InjectRepository(ManufacturingObservation)
    private readonly observationRepo: Repository<ManufacturingObservation>,
    @InjectRepository(WorkOrder)
    private readonly workOrderRepo: Repository<WorkOrder>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Derive operational state summary from real manufacturing signals and work orders.
   */
  async getOperationalState(
    tenantId: string,
    machineId?: string,
    projectId?: string,
  ): Promise<OperationalStateSummary> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const whereWO: any = { tenantId, status: WorkOrderStatus.IN_PROGRESS };
    if (projectId) whereWO.projectId = projectId;

    const activeWOs = await this.workOrderRepo.find({ where: whereWO });

    const whereSig: any = { tenantId, signalType: ManufacturingSignalType.CYCLE_TIME };
    if (machineId) whereSig.machineId = machineId;
    if (projectId) whereSig.projectId = projectId;

    const signals = await this.signalRepo.find({
      where: whereSig,
      order: { eventTimestamp: 'DESC' },
      take: 100,
    });

    let avgCycleTime = 0;
    if (signals.length > 0) {
      const sum = signals.reduce((acc, s) => acc + Number(s.value), 0);
      avgCycleTime = sum / signals.length;
    }

    const nominalCycleTime = 60.0; // Standard reference cycle time (sec)
    const deviationPct = nominalCycleTime > 0
      ? ((avgCycleTime - nominalCycleTime) / nominalCycleTime) * 100
      : 0;

    const whereObs: any = { tenantId };
    if (machineId) whereObs.machineId = machineId;
    if (projectId) whereObs.projectId = projectId;

    const recentObs = await this.observationRepo.find({
      where: whereObs,
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const whereRec: any = { tenantId, status: OperationalRecommendationStatus.REVIEW };
    if (machineId) whereRec.machineId = machineId;
    if (projectId) whereRec.projectId = projectId;

    const activeRecs = await this.recommendationRepo.find({
      where: whereRec,
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      machineId,
      activeWorkOrdersCount: activeWOs.length,
      averageCycleTimeSec: Math.round(avgCycleTime * 100) / 100,
      cycleTimeDeviationPct: Math.round(deviationPct * 100) / 100,
      totalSignalsCount: signals.length,
      anomaliesDetected: deviationPct > 15 ? 1 : 0,
      recentObservations: recentObs,
      activeRecommendations: activeRecs,
    };
  }

  /**
   * Evaluate manufacturing signals and generate advisory recommendations for human review.
   */
  async evaluateAnomaliesAndRecommend(
    tenantId: string,
    machineId?: string,
  ): Promise<OperationalRecommendation[]> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const state = await this.getOperationalState(tenantId, machineId);
    const generated: OperationalRecommendation[] = [];

    // Rule 1: Cycle time variance > 15%
    if (state.cycleTimeDeviationPct > 15) {
      const rec = this.recommendationRepo.create({
        tenantId,
        recommendationType: OperationalRecommendationType.PROCESS_VARIANCE_CHECK,
        status: OperationalRecommendationStatus.REVIEW,
        machineId: machineId || null,
        confidence: 0.88,
        title: `Process Variance: Cycle Time +${state.cycleTimeDeviationPct}% Deviation`,
        reasoning: `Average cycle time of ${state.averageCycleTimeSec}s exceeds nominal benchmark (60s) by ${state.cycleTimeDeviationPct}%. Investigation of tooling and thermal parameters is advised.`,
        evidenceContext: {
          avgCycleTime: state.averageCycleTimeSec,
          deviationPct: state.cycleTimeDeviationPct,
          signalsSampled: state.totalSignalsCount,
        },
      });

      const saved = await this.recommendationRepo.save(rec);
      generated.push(saved);
    }

    return generated;
  }

  /**
   * Governed human review of an operational recommendation.
   */
  async reviewRecommendation(
    id: string,
    dto: ReviewRecommendationDto,
    tenantId: string,
    user?: any,
  ): Promise<OperationalRecommendation> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const rec = await this.recommendationRepo.findOne({
      where: { id, tenantId },
    });

    if (!rec) {
      throw new NotFoundException(`Operational Recommendation '${id}' not found in tenant.`);
    }

    rec.status = dto.status;
    rec.humanReviewerId = user?.id || null;
    rec.reviewedAt = new Date();
    rec.decisionNotes = dto.decisionNotes || null;

    const saved = await this.recommendationRepo.save(rec);

    await this.auditService.log({
      tenantId,
      userId: user?.id,
      action: 'OPERATIONAL_RECOMMENDATION_REVIEWED',
      entityType: 'OPERATIONAL_RECOMMENDATION',
      entityId: saved.id,
      metadata: {
        previousStatus: rec.status,
        newStatus: dto.status,
        decisionNotes: dto.decisionNotes,
      },
    });

    return saved;
  }

  /**
   * List recommendations by status with multi-tenant filtering.
   */
  async getRecommendations(
    tenantId: string,
    status?: string,
  ): Promise<OperationalRecommendation[]> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const where: any = { tenantId };
    if (status) {
      where.status = status;
    }

    return this.recommendationRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }
}
