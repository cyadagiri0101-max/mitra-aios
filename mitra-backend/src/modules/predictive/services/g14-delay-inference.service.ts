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
import { G14FeatureEngineeringService, G14_CURRENT_FEATURE_VERSION } from './g14-feature-engineering.service';
import { G14ModelTrainingService } from './g14-model-training.service';
import { G14ModelArtifact } from '../entities/g14-model-artifact.entity';
import { Project } from '../../project/entities/project.entity';
import {
  PredictDelayDto,
  G14PredictionResult,
  G14FeatureAttribution,
  G14PredictionExplanation,
} from '../dto/g14-prediction.dto';

const FEATURE_DEFINITIONS: Array<{
  name: string;
  category: 'project' | 'execution' | 'capacity' | 'quality' | 'dependency' | 'temporal';
  desc: string;
}> = [
  { name: 'project_age_normalized', category: 'project', desc: 'Project age relative to standard timeline' },
  { name: 'milestone_completion_ratio', category: 'project', desc: 'Ratio of completed milestones' },
  { name: 'cumulative_schedule_variance', category: 'project', desc: 'Historical milestone schedule variance' },
  { name: 'overdue_milestones_count', category: 'project', desc: 'Number of active milestones overdue' },
  { name: 'remaining_planned_duration', category: 'project', desc: 'Remaining planned duration until delivery' },
  { name: 'total_work_orders', category: 'execution', desc: 'Total manufacturing work orders released' },
  { name: 'work_order_completion_ratio', category: 'execution', desc: 'Proportion of completed work orders' },
  { name: 'cumulative_work_order_delay', category: 'execution', desc: 'Accumulated shop-floor delay days' },
  { name: 'total_trials_count', category: 'execution', desc: 'Total mold trial observations' },
  { name: 'trial_failure_rate', category: 'execution', desc: 'Ratio of failed mold trials' },
  { name: 'design_demand_hours', category: 'capacity', desc: 'Total engineering design demand load' },
  { name: 'available_capacity_hours', category: 'capacity', desc: 'Available workstation and engineer hours' },
  { name: 'capacity_gap_hours', category: 'capacity', desc: 'Identified design/machining capacity deficit' },
  { name: 'average_utilization_pct', category: 'capacity', desc: 'Workstation utilization percentage' },
  { name: 'is_overloaded', category: 'capacity', desc: 'Shop-floor overload indicator flag' },
  { name: 'total_ncr_count', category: 'quality', desc: 'Total non-conformance records raised' },
  { name: 'open_ncr_count', category: 'quality', desc: 'Active unresolved non-conformance records' },
  { name: 'critical_ncr_count', category: 'quality', desc: 'Critical severity defect count' },
  { name: 'blocked_milestones_count', category: 'dependency', desc: 'Milestones delayed due to dependency blocks' },
  { name: 'time_elapsed_ratio', category: 'temporal', desc: 'Elapsed project time relative to total window' },
];

@Injectable()
export class G14DelayInferenceService {
  private readonly logger = new Logger(G14DelayInferenceService.name);

  constructor(
    private readonly featureEngineeringService: G14FeatureEngineeringService,
    private readonly modelTrainingService: G14ModelTrainingService,
    @InjectRepository(G14ModelArtifact)
    private readonly modelRepository: Repository<G14ModelArtifact>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly auditService: AuditService,
  ) {}

  protected requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for inference');
    }
    return tenantId;
  }

  /**
   * Generates a statistically defensible, explainable project delay forecast with uncertainty bounds.
   */
  async predictProjectDelay(
    dto: PredictDelayDto,
    tenantId: string,
  ): Promise<G14PredictionResult> {
    const scopeTenant = this.requireTenant(tenantId);
    const cutoff = dto.predictionCutoff ? new Date(dto.predictionCutoff) : new Date();
    const featureVersion = dto.featureVersion || G14_CURRENT_FEATURE_VERSION;
    const confidencePct = dto.confidenceIntervalPct || 95;

    // 1. Verify project exists for tenant
    const project = await this.projectRepository.findOne({
      where: { id: dto.projectId, tenantId: scopeTenant, deletedAt: IsNull() },
    });

    if (!project) {
      throw new NotFoundException(
        `Project ${dto.projectId} not found for current tenant.`,
      );
    }

    // 2. Fetch Active Model Artifact
    let model: G14ModelArtifact | null = null;
    if (dto.modelVersion) {
      model = await this.modelRepository.findOne({
        where: {
          tenantId: scopeTenant,
          modelVersion: dto.modelVersion,
          deletedAt: IsNull(),
        },
      });
    } else {
      model = await this.modelTrainingService.getActiveModel(scopeTenant);
    }

    // 3. Extract G14 Features at Cutoff
    const { featureVector, featureMetadata } =
      await this.featureEngineeringService.extractProjectFeatures(
        {
          projectId: dto.projectId,
          predictionCutoff: cutoff.toISOString(),
          featureVersion,
          persistSnapshot: false,
          computeGroundTruthTarget: false,
        },
        scopeTenant,
      );

    // 4. Safe Fallback if Model is Unavailable or Untrained
    if (!model || !model.weights || model.weights.length !== 20) {
      this.logger.warn(
        `No trained G14 model available for tenant ${scopeTenant}. Returning deterministic heuristic fallback.`,
      );

      const heuristicDelay = featureVector.project.cumulativeScheduleVarianceDays;
      const heuristicProb = heuristicDelay > 0 ? 0.75 : 0.25;

      const fallbackResult: G14PredictionResult = {
        projectId: dto.projectId,
        tenantId: scopeTenant,
        predictionCutoff: cutoff.toISOString(),
        featureVersion,
        modelVersion: 'FALLBACK_HEURISTIC_V0',
        modelType: 'HEURISTIC_FALLBACK',
        predictedDelayDays: heuristicDelay,
        isDelayed: heuristicDelay > 0,
        delayProbability: heuristicProb,
        lowerPredictionBound: Math.max(0, heuristicDelay - 7),
        upperPredictionBound: heuristicDelay + 14,
        uncertaintyMethod: 'FALLBACK_UNAVAILABLE',
        confidenceIntervalPct: confidencePct,
        dataQualityStatus: 'INSUFFICIENT',
        sourceRecordsHash: '00000000000000000000000000000000',
        explanation: {
          primaryContributors: [],
          summary:
            'Predictive ML model is untrained or unavailable for this tenant. Projected delay reflects cumulative milestone schedule variance.',
          riskTier: heuristicDelay > 14 ? 'HIGH' : heuristicDelay > 0 ? 'MEDIUM' : 'LOW',
        },
        generatedAt: new Date().toISOString(),
        inferenceStatus: 'FALLBACK_UNTRAINED_MODEL',
        warningMessage:
          'Model has not been trained on historical project data. Train a model via POST /api/predictive/models/train.',
      };

      await this.auditService.log({
        action: 'G14_DELAY_PREDICTION_FALLBACK',
        entityType: 'Project',
        entityId: dto.projectId,
        tenantId: scopeTenant,
        metadata: {
          reason: 'UNTRAINED_MODEL',
          cutoff: cutoff.toISOString(),
        },
      });

      return fallbackResult;
    }

    // 5. Execute Linear Model Inference
    const x = featureVector.denseVector;
    let rawScore = model.intercept;
    for (let j = 0; j < model.weights.length; j++) {
      rawScore += (model.weights[j] || 0) * (x[j] || 0);
    }

    const predictedDelayDays = Number(Math.max(0, rawScore).toFixed(1));
    const isDelayed = predictedDelayDays > 0.5;

    // Calibrated probability via sigmoid scaling
    const delayProbability = Number(
      (1 / (1 + Math.exp(-((rawScore - 2.0) / 6.0)))).toFixed(4),
    );

    // 6. Uncertainty & Prediction Interval (Z * Residual StdDev)
    const zScore = confidencePct === 99 ? 2.576 : confidencePct === 90 ? 1.645 : 1.96;
    const margin = zScore * (model.residualStdDev || 2.5);
    const lowerPredictionBound = Number(Math.max(0, predictedDelayDays - margin).toFixed(1));
    const upperPredictionBound = Number((predictedDelayDays + margin).toFixed(1));

    // 7. Feature Attribution & Explainability
    const attributions: G14FeatureAttribution[] = [];
    for (let j = 0; j < model.weights.length; j++) {
      const w = model.weights[j];
      const val = x[j];
      const contribution = w * val;
      const def = FEATURE_DEFINITIONS[j] || {
        name: `feature_${j}`,
        category: 'project',
        desc: 'Feature',
      };

      if (Math.abs(contribution) > 0.05) {
        attributions.push({
          featureIndex: j,
          featureName: def.name,
          category: def.category,
          featureValue: Number(val.toFixed(3)),
          importanceWeight: Number(w.toFixed(3)),
          contributionScore: Number(contribution.toFixed(3)),
          signalDirection:
            contribution > 0.1
              ? 'INCREASES_DELAY'
              : contribution < -0.1
              ? 'DECREASES_DELAY'
              : 'NEUTRAL',
          description: def.desc,
        });
      }
    }

    attributions.sort((a, b) => Math.abs(b.contributionScore) - Math.abs(a.contributionScore));
    const primaryContributors = attributions.slice(0, 5);

    // Risk tier assignment
    let riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (predictedDelayDays >= 21 || delayProbability >= 0.85) {
      riskTier = 'CRITICAL';
    } else if (predictedDelayDays >= 10 || delayProbability >= 0.65) {
      riskTier = 'HIGH';
    } else if (predictedDelayDays >= 3 || delayProbability >= 0.4) {
      riskTier = 'MEDIUM';
    }

    const explanation: G14PredictionExplanation = {
      primaryContributors,
      summary: `Project is estimated to experience a delay of ${predictedDelayDays} days (probability: ${(
        delayProbability * 100
      ).toFixed(1)}%). Primary contributing signal: ${
        primaryContributors[0]?.description || 'Normal milestone progression'
      }.`,
      riskTier,
    };

    const result: G14PredictionResult = {
      projectId: dto.projectId,
      tenantId: scopeTenant,
      predictionCutoff: cutoff.toISOString(),
      featureVersion,
      modelVersion: model.modelVersion,
      modelType: model.modelType,
      predictedDelayDays,
      isDelayed,
      delayProbability,
      lowerPredictionBound,
      upperPredictionBound,
      uncertaintyMethod: 'RESIDUAL_PREDICTION_INTERVAL',
      confidenceIntervalPct: confidencePct,
      dataQualityStatus: featureMetadata.dataQuality.hasMissingBaselines
        ? 'DEGRADED'
        : 'OPTIMAL',
      sourceRecordsHash: model.provenanceHash,
      explanation,
      generatedAt: new Date().toISOString(),
      inferenceStatus: 'SUCCESS',
    };

    await this.auditService.log({
      action: 'G14_DELAY_PREDICTION_GENERATED',
      entityType: 'Project',
      entityId: dto.projectId,
      tenantId: scopeTenant,
      metadata: {
        modelVersion: model.modelVersion,
        predictedDelayDays,
        delayProbability,
        riskTier,
        cutoff: cutoff.toISOString(),
      },
    });

    return result;
  }
}
