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
import { MachineMaster, MachineStatus } from '../../machine/entities/machinemaster.entity';
import { G14CapacityModelArtifact } from '../entities/g14-capacity-model-artifact.entity';
import { G14CapacityFeatureService, G14_CURRENT_CAPACITY_VERSION } from './g14-capacity-feature.service';
import { G14CapacityTrainingService } from './g14-capacity-training.service';
import {
  PredictCapacityDto,
  QueryBottlenecksDto,
  G14CapacityPredictionResult,
  G14BottleneckItem,
  G14CapacityAttribution,
  G14CapacityExplanation,
} from '../dto/g14-capacity.dto';

const CAPACITY_FEATURE_DEFS = [
  { name: 'available_machine_hours', desc: 'Standard operating hours available in horizon' },
  { name: 'booked_demand_hours', desc: 'Confirmed machine bookings demand' },
  { name: 'scheduled_work_order_hours', desc: 'Released & pending work order hours' },
  { name: 'total_demand_hours', desc: 'Aggregate scheduled machine demand' },
  { name: 'capacity_utilization_ratio', desc: 'Machine load to capacity ratio' },
  { name: 'historical_deficit_hours', desc: 'Initial baseline capacity deficit' },
  { name: 'queue_depth_work_orders', desc: 'Number of pending work orders queued' },
  { name: 'overdue_work_orders_count', desc: 'Count of overdue manufacturing jobs' },
  { name: 'active_bookings_count', desc: 'Active tool/machine booking slots' },
  { name: 'maintenance_downtime_hours', desc: 'Scheduled maintenance downtime' },
  { name: 'cost_per_hour_rate', desc: 'Machine hourly operating cost' },
  { name: 'is_active', desc: 'Machine operational availability status' },
  { name: 'near_term_due_load', desc: 'Demand due within next 7 days' },
  { name: 'concurrent_project_count', desc: 'Distinct projects competing for machine' },
  { name: 'forecast_horizon_ratio', desc: 'Forecast window scale factor' },
];

@Injectable()
export class G14CapacityForecastService {
  private readonly logger = new Logger(G14CapacityForecastService.name);

  constructor(
    private readonly featureService: G14CapacityFeatureService,
    private readonly trainingService: G14CapacityTrainingService,
    @InjectRepository(MachineMaster)
    private readonly machineRepository: Repository<MachineMaster>,
    @InjectRepository(G14CapacityModelArtifact)
    private readonly modelRepository: Repository<G14CapacityModelArtifact>,
    private readonly auditService: AuditService,
  ) {}

  protected requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for capacity forecasting');
    }
    return tenantId;
  }

  /**
   * Generates a statistically defensible capacity deficit & overload forecast for a machine.
   */
  async predictCapacity(
    dto: PredictCapacityDto,
    tenantId: string,
  ): Promise<G14CapacityPredictionResult> {
    const scopeTenant = this.requireTenant(tenantId);
    const cutoff = dto.predictionCutoff ? new Date(dto.predictionCutoff) : new Date();
    const horizonDays = dto.forecastHorizonDays || 30;
    const featureVersion = dto.featureVersion || G14_CURRENT_CAPACITY_VERSION;
    const confidencePct = dto.confidenceIntervalPct || 95;

    // 1. Verify machine
    const machine = await this.machineRepository.findOne({
      where: { id: dto.machineId, tenantId: scopeTenant, deletedAt: IsNull() },
    });

    if (!machine) {
      throw new NotFoundException(
        `Machine ${dto.machineId} not found for current tenant.`,
      );
    }

    // 2. Fetch Active Capacity Model Artifact
    let model: G14CapacityModelArtifact | null = null;
    if (dto.modelVersion) {
      model = await this.modelRepository.findOne({
        where: {
          tenantId: scopeTenant,
          modelVersion: dto.modelVersion,
          deletedAt: IsNull(),
        },
      });
    } else {
      model = await this.trainingService.getActiveModel(scopeTenant);
    }

    // 3. Extract G14 Capacity Features at Cutoff
    const { featureVector, featureMetadata, sourceRecordsHash } =
      await this.featureService.extractMachineCapacityFeatures(
        {
          machineId: dto.machineId,
          predictionCutoff: cutoff.toISOString(),
          forecastHorizonDays: horizonDays,
          featureVersion,
          persistSnapshot: false,
          computeGroundTruthTarget: false,
        },
        scopeTenant,
      );

    const availableHours = featureVector.machine.availableMachineHours;
    const initialDemandHours = featureVector.machine.totalDemandHours;

    // 4. Safe Heuristic Fallback if Model Untrained
    if (!model || !model.weights || model.weights.length !== 15) {
      this.logger.warn(
        `No trained G14 capacity model for tenant ${scopeTenant}. Returning deterministic heuristic forecast.`,
      );

      const heuristicDeficit = Math.max(0, initialDemandHours - availableHours);
      const heuristicUtil = availableHours > 0 ? initialDemandHours / availableHours : 1.0;
      const heuristicOverloadProb = heuristicUtil > 1.0 ? 0.85 : heuristicUtil > 0.8 ? 0.5 : 0.15;

      const fallbackResult: G14CapacityPredictionResult = {
        machineId: machine.id,
        machineNumber: machine.machineNumber,
        machineName: machine.machineName,
        tenantId: scopeTenant,
        predictionCutoff: cutoff.toISOString(),
        forecastHorizonDays: horizonDays,
        featureVersion,
        modelVersion: 'FALLBACK_CAPACITY_HEURISTIC_V0',
        modelType: 'HEURISTIC_CAPACITY_FALLBACK',
        predictedUtilizationRatio: Number(heuristicUtil.toFixed(4)),
        predictedAvailableHours: availableHours,
        predictedDemandHours: initialDemandHours,
        predictedDeficitHours: Number(heuristicDeficit.toFixed(2)),
        isOverloaded: heuristicDeficit > 0,
        overloadProbability: Number(heuristicOverloadProb.toFixed(4)),
        lowerDeficitBound: Math.max(0, heuristicDeficit - 10),
        upperDeficitBound: Number((heuristicDeficit + 20).toFixed(2)),
        uncertaintyMethod: 'FALLBACK_UNAVAILABLE',
        confidenceIntervalPct: confidencePct,
        dataQualityStatus: 'INSUFFICIENT',
        sourceRecordsHash,
        explanation: {
          primaryContributors: [],
          summary:
            'Predictive capacity ML model is untrained for this tenant. Projected deficit reflects scheduled bookings and work-order demand.',
          bottleneckRiskTier:
            heuristicUtil > 1.2 ? 'CRITICAL' : heuristicUtil > 1.0 ? 'HIGH' : heuristicUtil > 0.8 ? 'MEDIUM' : 'LOW',
        },
        generatedAt: new Date().toISOString(),
        inferenceStatus: 'FALLBACK_UNTRAINED_MODEL',
        warningMessage:
          'Model has not been trained on historical capacity data. Train a capacity model via POST /api/predictive/capacity/models/train.',
      };

      await this.auditService.log({
        action: 'G14_CAPACITY_PREDICTION_FALLBACK',
        entityType: 'MachineMaster',
        entityId: machine.id,
        tenantId: scopeTenant,
        metadata: {
          reason: 'UNTRAINED_CAPACITY_MODEL',
          cutoff: cutoff.toISOString(),
        },
      });

      return fallbackResult;
    }

    // 5. Linear Model Inference
    const x = featureVector.denseVector;
    let rawScore = model.intercept;
    for (let j = 0; j < model.weights.length; j++) {
      rawScore += (model.weights[j] || 0) * (x[j] || 0);
    }

    const predictedDeficitHours = Number(Math.max(0, rawScore).toFixed(2));
    const predictedDemandHours = Number((availableHours + predictedDeficitHours).toFixed(2));
    const predictedUtilizationRatio =
      availableHours > 0 ? Number((predictedDemandHours / availableHours).toFixed(4)) : 1.0;
    const isOverloaded = predictedDeficitHours > 0.5;

    // Calibrated overload probability
    const overloadProbability = Number(
      (1 / (1 + Math.exp(-((predictedUtilizationRatio - 1.0) / 0.15)))).toFixed(4),
    );

    // 6. Uncertainty Prediction Interval
    const zScore = confidencePct === 99 ? 2.576 : confidencePct === 90 ? 1.645 : 1.96;
    const margin = zScore * (model.residualStdDev || 5.0);
    const lowerDeficitBound = Number(Math.max(0, predictedDeficitHours - margin).toFixed(2));
    const upperDeficitBound = Number((predictedDeficitHours + margin).toFixed(2));

    // 7. Feature Attribution & Explainability
    const attributions: G14CapacityAttribution[] = [];
    for (let j = 0; j < model.weights.length; j++) {
      const w = model.weights[j];
      const val = x[j];
      const contribution = w * val;
      const def = CAPACITY_FEATURE_DEFS[j] || {
        name: `capacity_feature_${j}`,
        desc: 'Feature',
      };

      if (Math.abs(contribution) > 0.05) {
        attributions.push({
          featureIndex: j,
          featureName: def.name,
          featureValue: Number(val.toFixed(3)),
          importanceWeight: Number(w.toFixed(3)),
          contributionScore: Number(contribution.toFixed(3)),
          signalDirection:
            contribution > 0.1
              ? 'INCREASES_CAPACITY_PRESSURE'
              : contribution < -0.1
              ? 'DECREASES_CAPACITY_PRESSURE'
              : 'NEUTRAL',
          description: def.desc,
        });
      }
    }

    attributions.sort((a, b) => Math.abs(b.contributionScore) - Math.abs(a.contributionScore));
    const primaryContributors = attributions.slice(0, 5);

    // Risk tier assignment
    let bottleneckRiskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (predictedUtilizationRatio >= 1.3 || overloadProbability >= 0.85) {
      bottleneckRiskTier = 'CRITICAL';
    } else if (predictedUtilizationRatio >= 1.05 || overloadProbability >= 0.65) {
      bottleneckRiskTier = 'HIGH';
    } else if (predictedUtilizationRatio >= 0.85 || overloadProbability >= 0.4) {
      bottleneckRiskTier = 'MEDIUM';
    }

    const explanation: G14CapacityExplanation = {
      primaryContributors,
      summary: `Machine capacity utilization is projected at ${(
        predictedUtilizationRatio * 100
      ).toFixed(1)}% (${predictedDeficitHours} deficit hours). Primary contributing signal: ${
        primaryContributors[0]?.description || 'Normal workload distribution'
      }.`,
      bottleneckRiskTier,
    };

    const result: G14CapacityPredictionResult = {
      machineId: machine.id,
      machineNumber: machine.machineNumber,
      machineName: machine.machineName,
      tenantId: scopeTenant,
      predictionCutoff: cutoff.toISOString(),
      forecastHorizonDays: horizonDays,
      featureVersion,
      modelVersion: model.modelVersion,
      modelType: model.modelType,
      predictedUtilizationRatio,
      predictedAvailableHours: availableHours,
      predictedDemandHours,
      predictedDeficitHours,
      isOverloaded,
      overloadProbability,
      lowerDeficitBound,
      upperDeficitBound,
      uncertaintyMethod: 'RESIDUAL_PREDICTION_INTERVAL',
      confidenceIntervalPct: confidencePct,
      dataQualityStatus: featureMetadata.dataQuality.hasZeroAvailableHours
        ? 'DEGRADED'
        : 'OPTIMAL',
      sourceRecordsHash,
      explanation,
      generatedAt: new Date().toISOString(),
      inferenceStatus: 'SUCCESS',
    };

    await this.auditService.log({
      action: 'G14_CAPACITY_FORECAST_GENERATED',
      entityType: 'MachineMaster',
      entityId: machine.id,
      tenantId: scopeTenant,
      metadata: {
        modelVersion: model.modelVersion,
        predictedDeficitHours,
        predictedUtilizationRatio,
        bottleneckRiskTier,
      },
    });

    return result;
  }

  /**
   * Scans all tenant machines and ranks potential bottlenecks.
   */
  async getBottlenecks(
    dto: QueryBottlenecksDto,
    tenantId: string,
  ): Promise<G14BottleneckItem[]> {
    const scopeTenant = this.requireTenant(tenantId);
    const machines = await this.machineRepository.find({
      where: {
        tenantId: scopeTenant,
        status: MachineStatus.ACTIVE,
        deletedAt: IsNull(),
      },
    });

    const bottlenecks: G14BottleneckItem[] = [];

    for (const machine of machines) {
      const forecast = await this.predictCapacity(
        {
          machineId: machine.id,
          predictionCutoff: dto.predictionCutoff,
          forecastHorizonDays: dto.forecastHorizonDays || 30,
        },
        scopeTenant,
      );

      if (dto.riskTier && forecast.explanation.bottleneckRiskTier !== dto.riskTier) {
        continue;
      }

      bottlenecks.push({
        machineId: machine.id,
        machineNumber: machine.machineNumber,
        machineName: machine.machineName,
        location: machine.location,
        predictedDeficitHours: forecast.predictedDeficitHours,
        predictedUtilizationRatio: forecast.predictedUtilizationRatio,
        overloadProbability: forecast.overloadProbability,
        riskTier: forecast.explanation.bottleneckRiskTier,
        primaryBottleneckSignal:
          forecast.explanation.primaryContributors[0]?.description || 'Balanced workload',
        queueDepth: forecast.explanation.primaryContributors[0]?.featureValue || 0,
        activeWorkOrders: forecast.predictedDemandHours > 0 ? 1 : 0,
      });
    }

    // Rank critical and highest deficit first
    const tierPriority = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    bottlenecks.sort((a, b) => {
      const pDiff = tierPriority[b.riskTier] - tierPriority[a.riskTier];
      if (pDiff !== 0) return pDiff;
      return b.predictedDeficitHours - a.predictedDeficitHours;
    });

    await this.auditService.log({
      action: 'G14_BOTTLENECK_FORECAST_GENERATED',
      entityType: 'MachineMaster',
      entityId: 'ALL',
      tenantId: scopeTenant,
      metadata: {
        machinesScanned: machines.length,
        bottlenecksIdentified: bottlenecks.filter((b) => b.riskTier === 'HIGH' || b.riskTier === 'CRITICAL').length,
      },
    });

    return bottlenecks;
  }
}
