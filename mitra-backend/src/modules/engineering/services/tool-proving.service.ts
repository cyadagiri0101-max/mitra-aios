import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ToolProvingCycle,
  ToolProvingStageEnum,
} from '../entities/tool-proving-cycle.entity';
import {
  ToolModificationWorkload,
  ModificationCategoryEnum,
  ModificationRootCauseEnum,
} from '../entities/tool-modification-workload.entity';
import {
  CreateToolProvingCycleDto,
  LogToolModificationDto,
} from '../dto/design-lifecycle-capacity.dto';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';
import { EkosEntityType } from '../../ekos/entities/ekos-graph-node.entity';
import { EkosRelationType, EkosProvenanceType } from '../../ekos/entities/ekos-graph-edge.entity';
import { AuditService } from '../../audit/services/audit.service';

export interface PlannedVsActualToolLoadSummary {
  projectId: string;
  cycleCode: string;
  totalModifications: number;
  estimatedTotalWorkloadUnits: number;
  actualTotalWorkloadUnits: number;
  varianceUnits: number;
  modificationsByCategory: Record<string, { count: number; actualWorkload: number }>;
  modificationsByRootCause: Record<string, { count: number; actualWorkload: number }>;
}

@Injectable()
export class ToolProvingService {
  private readonly logger = new Logger(ToolProvingService.name);

  constructor(
    @InjectRepository(ToolProvingCycle)
    private readonly cycleRepo: Repository<ToolProvingCycle>,
    @InjectRepository(ToolModificationWorkload)
    private readonly modRepo: Repository<ToolModificationWorkload>,
    private readonly ekosGraphService: EkosGraphService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create or initialize a Tool Proving Cycle (T0, T1, T2)
   */
  async createProvingCycle(
    dto: CreateToolProvingCycleDto,
    tenantId: string,
  ): Promise<ToolProvingCycle> {
    if (!tenantId) throw new ForbiddenException('Tenant context is required.');
    if (!dto.projectId) throw new BadRequestException('Project ID is required.');

    const cycle = this.cycleRepo.create({
      tenantId,
      projectId: dto.projectId,
      toolId: dto.toolId,
      cycleCode: dto.cycleCode || 'T0',
      stage: ToolProvingStageEnum.T0_PREPARATION,
      trialDate: new Date(),
      machineId: dto.machineId || null,
      status: 'SCHEDULED',
      observationsCount: 0,
      modificationsCount: 0,
      totalActualModificationWorkload: 0,
      trialMetrics: { partsMolded: 0, cycleTimeSeconds: 0, defectsObserved: [] },
    });

    const saved = await this.cycleRepo.save(cycle);

    // Project to EKOS
    try {
      await this.ekosGraphService.recordEdge(
        {
          sourceEntityType: EkosEntityType.PROJECT,
          sourceEntityId: dto.projectId,
          sourceEntityRevision: 'Rev A',
          targetEntityType: EkosEntityType.TRIAL_OBSERVATION,
          targetEntityId: saved.id,
          relationType: EkosRelationType.OBSERVED_IN,
          provenanceType: EkosProvenanceType.TRANSACTIONAL_EVENT,
          confidence: 1.0,
          properties: { cycleCode: saved.cycleCode, toolId: saved.toolId },
        },
        tenantId,
      );
    } catch (err: any) {
      this.logger.warn(`EKOS projection non-blocking failure: ${err?.message}`);
    }

    return saved;
  }

  /**
   * Log a Tool Modification Workload item (T-Dia, E-Dia, OFC, Cooling, etc.)
   */
  async logModification(
    dto: LogToolModificationDto,
    tenantId: string,
    user?: any,
  ): Promise<ToolModificationWorkload> {
    if (!tenantId) throw new ForbiddenException('Tenant context is required.');

    const cycle = await this.cycleRepo.findOne({
      where: { id: dto.toolProvingCycleId, tenantId },
    });
    if (!cycle) {
      throw new NotFoundException(`Tool proving cycle ${dto.toolProvingCycleId} not found.`);
    }

    const actualUnits = Number(dto.actualWorkloadUnits || dto.estimatedWorkloadUnits);

    const mod = this.modRepo.create({
      tenantId,
      projectId: dto.projectId,
      toolProvingCycleId: dto.toolProvingCycleId,
      modificationCode: dto.modificationCode,
      category: dto.category,
      rootCause: dto.rootCause,
      description: dto.description,
      estimatedWorkloadUnits: dto.estimatedWorkloadUnits,
      actualWorkloadUnits: actualUnits,
      assignedEngineerId: dto.assignedEngineerId || null,
      status: 'APPROVED',
      approvedBy: user?.email || 'LEAD_TOOLING_ENGINEER',
      approvedAt: new Date(),
    });

    const saved = await this.modRepo.save(mod);

    // Update cycle counters
    cycle.modificationsCount = (cycle.modificationsCount || 0) + 1;
    cycle.totalActualModificationWorkload =
      Number(cycle.totalActualModificationWorkload || 0) + actualUnits;
    cycle.stage = ToolProvingStageEnum.MODIFICATION_REQUIRED;
    cycle.status = 'MODIFICATIONS_APPROVED';
    await this.cycleRepo.save(cycle);

    return saved;
  }

  /**
   * Calculate Planned vs Actual Tool Proving Load Summary
   */
  async getPlannedVsActualLoad(
    cycleId: string,
    tenantId: string,
  ): Promise<PlannedVsActualToolLoadSummary> {
    if (!tenantId) throw new ForbiddenException('Tenant context is required.');

    const cycle = await this.cycleRepo.findOne({ where: { id: cycleId, tenantId } });
    if (!cycle) throw new NotFoundException(`Tool proving cycle ${cycleId} not found.`);

    const modifications = await this.modRepo.find({
      where: { toolProvingCycleId: cycleId, tenantId },
    });

    let estTotal = 0;
    let actTotal = 0;
    const byCategory: Record<string, { count: number; actualWorkload: number }> = {};
    const byRootCause: Record<string, { count: number; actualWorkload: number }> = {};

    for (const m of modifications) {
      const est = Number(m.estimatedWorkloadUnits || 0);
      const act = Number(m.actualWorkloadUnits || 0);
      estTotal += est;
      actTotal += act;

      const catKey = m.category;
      if (!byCategory[catKey]) byCategory[catKey] = { count: 0, actualWorkload: 0 };
      byCategory[catKey].count += 1;
      byCategory[catKey].actualWorkload += act;

      const causeKey = m.rootCause;
      if (!byRootCause[causeKey]) byRootCause[causeKey] = { count: 0, actualWorkload: 0 };
      byRootCause[causeKey].count += 1;
      byRootCause[causeKey].actualWorkload += act;
    }

    return {
      projectId: cycle.projectId,
      cycleCode: cycle.cycleCode,
      totalModifications: modifications.length,
      estimatedTotalWorkloadUnits: Number(estTotal.toFixed(2)),
      actualTotalWorkloadUnits: Number(actTotal.toFixed(2)),
      varianceUnits: Number((actTotal - estTotal).toFixed(2)),
      modificationsByCategory: byCategory,
      modificationsByRootCause: byRootCause,
    };
  }

  /**
   * Advance to Next Trial (e.g. T0 -> T1 Re-Trial)
   */
  async advanceToReTrial(
    cycleId: string,
    tenantId: string,
  ): Promise<ToolProvingCycle> {
    if (!tenantId) throw new ForbiddenException('Tenant context is required.');

    const cycle = await this.cycleRepo.findOne({ where: { id: cycleId, tenantId } });
    if (!cycle) throw new NotFoundException(`Tool proving cycle ${cycleId} not found.`);

    cycle.stage = ToolProvingStageEnum.RE_TRIAL;
    cycle.status = 'RUNNING';
    return await this.cycleRepo.save(cycle);
  }
}
