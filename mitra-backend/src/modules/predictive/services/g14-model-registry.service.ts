import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { createHash } from 'crypto';
import { AuditService } from '../../audit/services/audit.service';
import {
  G14ModelRegistry,
  ModelCapability,
  ModelLifecycleStatus,
} from '../entities/g14-model-registry.entity';
import {
  QueryModelRegistryDto,
  EvaluateModelDto,
  ApproveModelDto,
  RejectModelDto,
  ActivateModelDto,
  RollbackModelDto,
  RegisterModelDto,
} from '../dto/g14-registry.dto';

@Injectable()
export class G14ModelRegistryService {
  private readonly logger = new Logger(G14ModelRegistryService.name);

  constructor(
    @InjectRepository(G14ModelRegistry)
    private readonly registryRepository: Repository<G14ModelRegistry>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  protected requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for model registry operations');
    }
    return tenantId;
  }

  /**
   * Computes the deterministic SHA-256 cryptographic digest of a model artifact payload.
   */
  computeArtifactHash(
    capability: ModelCapability,
    modelVersion: string,
    featureVersion: string,
    weights: number[],
    intercept: number,
    residualStdDev: number,
  ): string {
    const payload = JSON.stringify({
      capability,
      modelVersion,
      featureVersion,
      weights,
      intercept: Number(intercept.toFixed(4)),
      residualStdDev: Number(residualStdDev.toFixed(4)),
    });
    return createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Registers a newly trained model artifact into the governed registry.
   */
  async registerModel(
    dto: RegisterModelDto,
    tenantId: string,
    actor?: string,
  ): Promise<G14ModelRegistry> {
    const scopeTenant = this.requireTenant(tenantId);
    const artifactHash = this.computeArtifactHash(
      dto.capability,
      dto.modelVersion,
      dto.featureVersion,
      dto.weights,
      dto.intercept,
      dto.residualStdDev,
    );

    const model = await this.registryRepository.save({
      tenantId: scopeTenant,
      modelFamily: 'G14_PREDICTIVE',
      capability: dto.capability,
      modelVersion: dto.modelVersion,
      featureVersion: dto.featureVersion,
      modelType: dto.modelType,
      algorithm: dto.algorithm || 'RIDGE_REGRESSION',
      weights: dto.weights,
      intercept: dto.intercept,
      residualStdDev: dto.residualStdDev,
      hyperparameters: dto.hyperparameters || null,
      evaluationMetrics: dto.evaluationMetrics,
      uncertaintyMethod: dto.uncertaintyMethod || 'RESIDUAL_PREDICTION_INTERVAL',
      status: ModelLifecycleStatus.TRAINED,
      provenanceHash: dto.provenanceHash,
      trainingDatasetHash: dto.trainingDatasetHash || null,
      artifactHash,
      trainingSampleCount: dto.trainingSampleCount,
      validationSampleCount: dto.validationSampleCount || 0,
      testSampleCount: dto.testSampleCount || 0,
      trainingWindowStart: dto.trainingWindowStart || null,
      trainingWindowEnd: dto.trainingWindowEnd || null,
      createdBy: actor || 'SYSTEM',
    });

    await this.auditService.log({
      action: 'G14_MODEL_REGISTERED',
      entityType: 'G14ModelRegistry',
      entityId: model.id,
      tenantId: scopeTenant,
      metadata: {
        modelVersion: model.modelVersion,
        capability: model.capability,
        artifactHash,
        actor,
      },
    });

    return model;
  }

  /**
   * Evaluates a trained model against validation criteria and transitions state to EVALUATED.
   */
  async evaluateModel(
    modelId: string,
    dto: EvaluateModelDto,
    tenantId: string,
    actor?: string,
  ): Promise<G14ModelRegistry> {
    const scopeTenant = this.requireTenant(tenantId);
    const model = await this.getModelById(modelId, scopeTenant);

    if (model.status !== ModelLifecycleStatus.TRAINED) {
      throw new BadRequestException(
        `Cannot evaluate model in state '${model.status}'. Expected state: '${ModelLifecycleStatus.TRAINED}'.`,
      );
    }

    if (dto.evaluationMetrics) {
      model.evaluationMetrics = {
        ...model.evaluationMetrics,
        ...dto.evaluationMetrics,
      };
    }

    // Evaluation Quality Gate Checks
    if (model.trainingSampleCount < 5) {
      throw new BadRequestException(
        `Evaluation gate failed: sample count (${model.trainingSampleCount}) below minimum threshold of 5.`,
      );
    }

    model.status = ModelLifecycleStatus.EVALUATED;
    model.updatedBy = actor || 'SYSTEM';

    const saved = await this.registryRepository.save(model);

    await this.auditService.log({
      action: 'G14_MODEL_EVALUATED',
      entityType: 'G14ModelRegistry',
      entityId: model.id,
      tenantId: scopeTenant,
      metadata: {
        modelVersion: model.modelVersion,
        capability: model.capability,
        metrics: model.evaluationMetrics,
        actor,
      },
    });

    return saved;
  }

  /**
   * Requests formal approval for an evaluated model.
   */
  async requestApproval(
    modelId: string,
    tenantId: string,
    actor?: string,
  ): Promise<G14ModelRegistry> {
    const scopeTenant = this.requireTenant(tenantId);
    const model = await this.getModelById(modelId, scopeTenant);

    if (model.status !== ModelLifecycleStatus.EVALUATED) {
      throw new BadRequestException(
        `Cannot request approval for model in state '${model.status}'. Expected state: '${ModelLifecycleStatus.EVALUATED}'.`,
      );
    }

    model.status = ModelLifecycleStatus.PENDING_APPROVAL;
    model.updatedBy = actor || 'SYSTEM';

    const saved = await this.registryRepository.save(model);

    await this.auditService.log({
      action: 'G14_MODEL_APPROVAL_REQUESTED',
      entityType: 'G14ModelRegistry',
      entityId: model.id,
      tenantId: scopeTenant,
      metadata: {
        modelVersion: model.modelVersion,
        capability: model.capability,
        actor,
      },
    });

    return saved;
  }

  /**
   * Formally approves a model for activation.
   */
  async approveModel(
    modelId: string,
    dto: ApproveModelDto,
    tenantId: string,
    actor?: string,
  ): Promise<G14ModelRegistry> {
    const scopeTenant = this.requireTenant(tenantId);
    const model = await this.getModelById(modelId, scopeTenant);

    if (model.status !== ModelLifecycleStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Cannot approve model in state '${model.status}'. Expected state: '${ModelLifecycleStatus.PENDING_APPROVAL}'.`,
      );
    }

    model.status = ModelLifecycleStatus.APPROVED;
    model.approvedBy = actor || 'ADMIN';
    model.approvalNotes = dto.approvalNotes || null;
    model.updatedBy = actor || 'SYSTEM';

    const saved = await this.registryRepository.save(model);

    await this.auditService.log({
      action: 'G14_MODEL_APPROVED',
      entityType: 'G14ModelRegistry',
      entityId: model.id,
      tenantId: scopeTenant,
      metadata: {
        modelVersion: model.modelVersion,
        capability: model.capability,
        approvedBy: model.approvedBy,
      },
    });

    return saved;
  }

  /**
   * Rejects a model during approval review.
   */
  async rejectModel(
    modelId: string,
    dto: RejectModelDto,
    tenantId: string,
    actor?: string,
  ): Promise<G14ModelRegistry> {
    const scopeTenant = this.requireTenant(tenantId);
    const model = await this.getModelById(modelId, scopeTenant);

    if (model.status !== ModelLifecycleStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Cannot reject model in state '${model.status}'. Expected state: '${ModelLifecycleStatus.PENDING_APPROVAL}'.`,
      );
    }

    model.status = ModelLifecycleStatus.REJECTED;
    model.approvalNotes = dto.rejectionReason;
    model.updatedBy = actor || 'SYSTEM';

    const saved = await this.registryRepository.save(model);

    await this.auditService.log({
      action: 'G14_MODEL_REJECTED',
      entityType: 'G14ModelRegistry',
      entityId: model.id,
      tenantId: scopeTenant,
      metadata: {
        modelVersion: model.modelVersion,
        capability: model.capability,
        rejectionReason: dto.rejectionReason,
      },
    });

    return saved;
  }

  /**
   * Atomically activates an APPROVED model as the champion active model for its capability.
   */
  async activateModel(
    modelId: string,
    dto: ActivateModelDto,
    tenantId: string,
    actor?: string,
  ): Promise<G14ModelRegistry> {
    const scopeTenant = this.requireTenant(tenantId);
    const model = await this.getModelById(modelId, scopeTenant);

    if (model.status !== ModelLifecycleStatus.APPROVED) {
      throw new BadRequestException(
        `Cannot activate model in state '${model.status}'. Expected state: '${ModelLifecycleStatus.APPROVED}'.`,
      );
    }

    // Cryptographic Integrity Verification
    const expectedHash = this.computeArtifactHash(
      model.capability,
      model.modelVersion,
      model.featureVersion,
      model.weights,
      model.intercept,
      model.residualStdDev,
    );

    if (model.artifactHash !== expectedHash) {
      await this.auditService.log({
        action: 'G14_MODEL_INTEGRITY_FAILURE',
        entityType: 'G14ModelRegistry',
        entityId: model.id,
        tenantId: scopeTenant,
        metadata: {
          storedHash: model.artifactHash,
          calculatedHash: expectedHash,
        },
      });
      throw new BadRequestException(
        'Model artifact cryptographic integrity verification failed. Activation aborted.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      // 1. Retire any currently active model for this tenant and capability
      const currentActive = await queryRunner.manager.findOne(G14ModelRegistry, {
        where: {
          tenantId: scopeTenant,
          capability: model.capability,
          status: ModelLifecycleStatus.ACTIVE,
          deletedAt: IsNull(),
        },
      });

      if (currentActive) {
        currentActive.status = ModelLifecycleStatus.RETIRED;
        currentActive.retiredAt = new Date();
        currentActive.updatedBy = actor || 'SYSTEM';
        await queryRunner.manager.save(currentActive);
      }

      // 2. Activate target model
      model.status = ModelLifecycleStatus.ACTIVE;
      model.activatedAt = new Date();
      model.updatedBy = actor || 'SYSTEM';
      const activated = await queryRunner.manager.save(model);

      await queryRunner.commitTransaction();

      if (currentActive) {
        await this.auditService.log({
          action: 'G14_MODEL_RETIRED',
          entityType: 'G14ModelRegistry',
          entityId: currentActive.id,
          tenantId: scopeTenant,
          metadata: {
            modelVersion: currentActive.modelVersion,
            capability: currentActive.capability,
            supersededBy: model.id,
          },
        });
      }

      await this.auditService.log({
        action: 'G14_MODEL_ACTIVATED',
        entityType: 'G14ModelRegistry',
        entityId: activated.id,
        tenantId: scopeTenant,
        metadata: {
          modelVersion: activated.modelVersion,
          capability: activated.capability,
          actor,
        },
      });

      return activated;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Retires an ACTIVE model.
   */
  async retireModel(
    modelId: string,
    tenantId: string,
    actor?: string,
  ): Promise<G14ModelRegistry> {
    const scopeTenant = this.requireTenant(tenantId);
    const model = await this.getModelById(modelId, scopeTenant);

    if (model.status !== ModelLifecycleStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot retire model in state '${model.status}'. Expected state: '${ModelLifecycleStatus.ACTIVE}'.`,
      );
    }

    model.status = ModelLifecycleStatus.RETIRED;
    model.retiredAt = new Date();
    model.updatedBy = actor || 'SYSTEM';

    const saved = await this.registryRepository.save(model);

    await this.auditService.log({
      action: 'G14_MODEL_RETIRED',
      entityType: 'G14ModelRegistry',
      entityId: model.id,
      tenantId: scopeTenant,
      metadata: {
        modelVersion: model.modelVersion,
        capability: model.capability,
        actor,
      },
    });

    return saved;
  }

  /**
   * Atomically rolls back from the current ACTIVE model to the previous RETIRED champion model.
   */
  async rollbackModel(
    modelId: string,
    dto: RollbackModelDto,
    tenantId: string,
    actor?: string,
  ): Promise<G14ModelRegistry> {
    const scopeTenant = this.requireTenant(tenantId);
    const currentActive = await this.getModelById(modelId, scopeTenant);

    if (currentActive.status !== ModelLifecycleStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot rollback model in state '${currentActive.status}'. Only ACTIVE models can be rolled back.`,
      );
    }

    // Find the most recent RETIRED model for this capability
    const previousModel = await this.registryRepository.findOne({
      where: {
        tenantId: scopeTenant,
        capability: currentActive.capability,
        status: ModelLifecycleStatus.RETIRED,
        deletedAt: IsNull(),
      },
      order: { retiredAt: 'DESC' },
    });

    if (!previousModel) {
      throw new BadRequestException(
        `No previous RETIRED model available for capability '${currentActive.capability}' to rollback to.`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      // 1. Mark current as ROLLED_BACK
      currentActive.status = ModelLifecycleStatus.ROLLED_BACK;
      currentActive.rolledBackAt = new Date();
      currentActive.rollbackReason = dto.rollbackReason;
      currentActive.updatedBy = actor || 'SYSTEM';
      await queryRunner.manager.save(currentActive);

      // 2. Re-activate previous model
      previousModel.status = ModelLifecycleStatus.ACTIVE;
      previousModel.activatedAt = new Date();
      previousModel.retiredAt = null;
      previousModel.updatedBy = actor || 'SYSTEM';
      const restored = await queryRunner.manager.save(previousModel);

      await queryRunner.commitTransaction();

      await this.auditService.log({
        action: 'G14_MODEL_ROLLED_BACK',
        entityType: 'G14ModelRegistry',
        entityId: currentActive.id,
        tenantId: scopeTenant,
        metadata: {
          fromModelId: currentActive.id,
          toModelId: restored.id,
          reason: dto.rollbackReason,
          actor,
        },
      });

      return restored;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Retrieves active champion model for a capability.
   */
  async getActiveModelByCapability(
    capability: ModelCapability,
    tenantId: string,
  ): Promise<G14ModelRegistry | null> {
    const scopeTenant = this.requireTenant(tenantId);
    return this.registryRepository.findOne({
      where: {
        tenantId: scopeTenant,
        capability,
        status: ModelLifecycleStatus.ACTIVE,
        deletedAt: IsNull(),
      },
      order: { activatedAt: 'DESC' },
    });
  }

  /**
   * Retrieves a single model by ID with tenant isolation.
   */
  async getModelById(modelId: string, tenantId: string): Promise<G14ModelRegistry> {
    const scopeTenant = this.requireTenant(tenantId);
    const model = await this.registryRepository.findOne({
      where: { id: modelId, tenantId: scopeTenant, deletedAt: IsNull() },
    });

    if (!model) {
      throw new NotFoundException(
        `Model ${modelId} not found for current tenant.`,
      );
    }
    return model;
  }

  /**
   * Lists models in registry with tenant isolation and optional filtering.
   */
  async listModels(
    query: QueryModelRegistryDto,
    tenantId: string,
  ): Promise<G14ModelRegistry[]> {
    const scopeTenant = this.requireTenant(tenantId);
    const where: any = { tenantId: scopeTenant, deletedAt: IsNull() };

    if (query.capability) {
      where.capability = query.capability;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.modelVersion) {
      where.modelVersion = query.modelVersion;
    }

    return this.registryRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }
}
