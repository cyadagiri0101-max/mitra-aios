import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { createHash } from 'crypto';
import { AuditService } from '../../audit/services/audit.service';
import { G14FeatureSnapshot } from '../entities/g14-feature-snapshot.entity';
import { G14ModelArtifact } from '../entities/g14-model-artifact.entity';
import {
  TrainModelDto,
  G14ModelEvaluationMetrics,
} from '../dto/g14-prediction.dto';
import { G14_CURRENT_FEATURE_VERSION } from './g14-feature-engineering.service';

export const G14_DEFAULT_MODEL_VERSION = 'G14_RIDGE_V1';

@Injectable()
export class G14ModelTrainingService {
  private readonly logger = new Logger(G14ModelTrainingService.name);

  constructor(
    @InjectRepository(G14FeatureSnapshot)
    private readonly snapshotRepository: Repository<G14FeatureSnapshot>,
    @InjectRepository(G14ModelArtifact)
    private readonly modelRepository: Repository<G14ModelArtifact>,
    private readonly auditService: AuditService,
  ) {}

  protected requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for model training operations');
    }
    return tenantId;
  }

  /**
   * Solves regularized linear system (X^T * X + alpha * I) * w = X^T * y using Gaussian elimination.
   */
  private solveRidgeRegression(
    X: number[][],
    y: number[],
    alpha: number = 1.0,
  ): { weights: number[]; intercept: number } {
    const n = X.length;
    const d = X[0].length;

    // Prepend 1.0 for intercept column: X_aug of size n x (d + 1)
    const X_aug: number[][] = X.map((row) => [1.0, ...row]);
    const numParams = d + 1;

    // Compute A = X_aug^T * X_aug + alpha * I (do not regularize intercept at index 0)
    const A: number[][] = Array.from({ length: numParams }, () =>
      Array(numParams).fill(0),
    );
    const b: number[] = Array(numParams).fill(0);

    for (let i = 0; i < n; i++) {
      const row = X_aug[i];
      const target = y[i];
      for (let j = 0; j < numParams; j++) {
        b[j] += row[j] * target;
        for (let k = 0; k < numParams; k++) {
          A[j][k] += row[j] * row[k];
        }
      }
    }

    // Add ridge penalty to diagonal (skip index 0)
    for (let j = 1; j < numParams; j++) {
      A[j][j] += alpha;
    }

    // Solve A * theta = b via Gaussian elimination with partial pivoting
    const M: number[][] = A.map((row, i) => [...row, b[i]]);

    for (let col = 0; col < numParams; col++) {
      // Pivot selection
      let maxRow = col;
      for (let r = col + 1; r < numParams; r++) {
        if (Math.abs(M[r][col]) > Math.abs(M[maxRow][col])) {
          maxRow = r;
        }
      }
      const temp = M[col];
      M[col] = M[maxRow];
      M[maxRow] = temp;

      const pivot = M[col][col];
      if (Math.abs(pivot) < 1e-12) {
        continue;
      }

      for (let j = col; j <= numParams; j++) {
        M[col][j] /= pivot;
      }

      for (let r = 0; r < numParams; r++) {
        if (r !== col) {
          const factor = M[r][col];
          for (let j = col; j <= numParams; j++) {
            M[r][j] -= factor * M[col][j];
          }
        }
      }
    }

    const theta = M.map((row) => row[numParams]);
    const intercept = theta[0] || 0;
    const weights = theta.slice(1);

    return { weights, intercept };
  }

  /**
   * Trains a governed G14 predictive delay model using chronological dataset splitting.
   */
  async trainProjectDelayModel(
    dto: TrainModelDto,
    tenantId: string,
  ): Promise<G14ModelArtifact> {
    const scopeTenant = this.requireTenant(tenantId);
    const featureVersion = dto.featureVersion || G14_CURRENT_FEATURE_VERSION;
    const minSamples = dto.minSamplesThreshold || 5;
    const alpha = dto.regularizationAlpha || 1.0;

    if (featureVersion !== G14_CURRENT_FEATURE_VERSION) {
      throw new BadRequestException(
        `Cannot train model for unsupported feature version: ${featureVersion}`,
      );
    }

    // 1. Query all completed feature snapshots with ground truth targets
    const snapshots = await this.snapshotRepository.find({
      where: {
        tenantId: scopeTenant,
        featureVersion,
        deletedAt: IsNull(),
      },
      order: { predictionCutoff: 'ASC' },
    });

    const validSnapshots = snapshots.filter(
      (s) =>
        s.groundTruthTarget !== null &&
        s.groundTruthTarget !== undefined &&
        typeof s.groundTruthTarget.projectDelayDays === 'number' &&
        Array.isArray(s.featureVector?.denseVector) &&
        s.featureVector.denseVector.length === 20,
    );

    if (validSnapshots.length < minSamples) {
      throw new BadRequestException(
        `Insufficient historical training snapshots (${validSnapshots.length} available, ${minSamples} required).`,
      );
    }

    // 2. Chronological Split (Train: 70%, Val: 15%, Test: 15%)
    const totalCount = validSnapshots.length;
    const trainEnd = Math.max(3, Math.floor(totalCount * 0.7));
    const valEnd = Math.max(trainEnd + 1, Math.floor(totalCount * 0.85));

    const trainSet = validSnapshots.slice(0, trainEnd);
    const valSet = validSnapshots.slice(trainEnd, valEnd);
    const testSet = validSnapshots.slice(valEnd);

    const X_train = trainSet.map((s) => s.featureVector.denseVector);
    const y_train = trainSet.map((s) => s.groundTruthTarget!.projectDelayDays);

    // 3. Train Ridge Linear Regression Model
    const { weights, intercept } = this.solveRidgeRegression(X_train, y_train, alpha);

    // 4. Compute Naive Baseline (Mean train delay)
    const naiveMeanDelay = y_train.reduce((a, b) => a + b, 0) / y_train.length;

    // 5. Evaluate on Validation / Test Set
    const evalSet = valSet.length > 0 ? valSet : trainSet;
    let sumAbsError = 0;
    let sumSqError = 0;
    let sumNaiveAbsError = 0;
    let sumTotalVar = 0;
    let correctDelayClassification = 0;
    let brierScoreSum = 0;

    for (const sample of evalSet) {
      const x = sample.featureVector.denseVector;
      const y = sample.groundTruthTarget!.projectDelayDays;
      const y_isDelayed = sample.groundTruthTarget!.isDelayed ? 1 : 0;

      // Predict
      let y_pred = intercept;
      for (let j = 0; j < weights.length; j++) {
        y_pred += (weights[j] || 0) * (x[j] || 0);
      }

      const absErr = Math.abs(y - y_pred);
      const sqErr = (y - y_pred) ** 2;
      sumAbsError += absErr;
      sumSqError += sqErr;
      sumNaiveAbsError += Math.abs(y - naiveMeanDelay);
      sumTotalVar += (y - naiveMeanDelay) ** 2;

      // Classification metric (prob > 0.5 matches y_isDelayed)
      const p_delay = 1 / (1 + Math.exp(-(y_pred / 10)));
      const predIsDelayed = p_delay >= 0.5 ? 1 : 0;
      if (predIsDelayed === y_isDelayed) {
        correctDelayClassification++;
      }
      brierScoreSum += (p_delay - y_isDelayed) ** 2;
    }

    const nEval = evalSet.length;
    const mae = sumAbsError / nEval;
    const rmse = Math.sqrt(sumSqError / nEval);
    const r2 = sumTotalVar > 0 ? Math.max(0, 1 - sumSqError / sumTotalVar) : 0;
    const naiveMae = sumNaiveAbsError / nEval;
    const improvementOverNaivePct =
      naiveMae > 0 ? Math.max(0, ((naiveMae - mae) / naiveMae) * 100) : 0;
    const accuracy = nEval > 0 ? correctDelayClassification / nEval : 1.0;
    const brierScore = nEval > 0 ? brierScoreSum / nEval : 0;
    const residualStdDev = rmse > 0 ? rmse : 1.0;

    const evaluationMetrics: G14ModelEvaluationMetrics = {
      mae: Number(mae.toFixed(4)),
      rmse: Number(rmse.toFixed(4)),
      r2: Number(r2.toFixed(4)),
      accuracy: Number(accuracy.toFixed(4)),
      brierScore: Number(brierScore.toFixed(4)),
      sampleCount: totalCount,
      trainSamples: trainSet.length,
      valSamples: valSet.length,
      testSamples: testSet.length,
      baselineNaiveMae: Number(naiveMae.toFixed(4)),
      improvementOverNaivePct: Number(improvementOverNaivePct.toFixed(2)),
    };

    // 6. Generate Provenance Signature
    const provenanceSignature = JSON.stringify({
      tenantId: scopeTenant,
      sampleIds: validSnapshots.map((s) => s.id),
      weights,
      intercept,
      metrics: evaluationMetrics,
    });
    const provenanceHash = createHash('sha256')
      .update(provenanceSignature)
      .digest('hex');

    const modelVersion = `${G14_DEFAULT_MODEL_VERSION}_${Date.now()}`;

    // 7. Deactivate older active models for this tenant
    await this.modelRepository.update(
      { tenantId: scopeTenant, isActive: true },
      { isActive: false },
    );

    // 8. Persist new model artifact
    const artifact = await this.modelRepository.save({
      tenantId: scopeTenant,
      modelVersion,
      featureVersion,
      modelType: dto.modelType || 'RIDGE_CALIBRATED_REGRESSION',
      weights,
      intercept: Number(intercept.toFixed(4)),
      residualStdDev: Number(residualStdDev.toFixed(4)),
      evaluationMetrics,
      sampleCount: totalCount,
      trainingWindowStart: validSnapshots[0].predictionCutoff,
      trainingWindowEnd: validSnapshots[validSnapshots.length - 1].predictionCutoff,
      provenanceHash,
      isActive: true,
    });

    await this.auditService.log({
      action: 'G14_PREDICTIVE_MODEL_TRAINED',
      entityType: 'G14ModelArtifact',
      entityId: artifact.id,
      tenantId: scopeTenant,
      metadata: {
        modelVersion,
        featureVersion,
        mae,
        rmse,
        r2,
        samples: totalCount,
        provenanceHash,
      },
    });

    return artifact;
  }

  /**
   * Retrieves the active trained model artifact for a tenant.
   */
  async getActiveModel(tenantId: string): Promise<G14ModelArtifact | null> {
    const scopeTenant = this.requireTenant(tenantId);
    return this.modelRepository.findOne({
      where: {
        tenantId: scopeTenant,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: { createdAt: 'DESC' },
    });
  }
}
