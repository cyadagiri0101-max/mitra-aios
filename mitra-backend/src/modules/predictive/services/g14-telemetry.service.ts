import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull } from 'typeorm';
import { createHash } from 'crypto';
import { Project } from '../../project/entities/project.entity';
import { ProjectMilestone } from '../../project/entities/projectmilestone.entity';
import { ScheduleBaseline } from '../../project/entities/schedule-baseline.entity';
import { WorkOrder } from '../../manufacturing/entities/workorder.entity';
import { NcrRecord } from '../../quality/entities/ncr-record.entity';
import { TrialObservation } from '../../quality/entities/trialobservation.entity';
import { ProjectDesignLoad } from '../../design-load/entities/project-design-load.entity';

export interface AuthoritativeTelemetryPayload {
  project: Project;
  milestones: ProjectMilestone[];
  baselines: ScheduleBaseline[];
  workOrders: WorkOrder[];
  ncrs: NcrRecord[];
  trials: TrialObservation[];
  designLoads: ProjectDesignLoad[];
  predictionCutoff: Date;
  sourceHash: string;
  futureExcludedCounts: {
    milestones: number;
    workOrders: number;
    ncrs: number;
    trials: number;
  };
}

@Injectable()
export class G14TelemetryService {
  private readonly logger = new Logger(G14TelemetryService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMilestone)
    private readonly milestoneRepository: Repository<ProjectMilestone>,
    @InjectRepository(ScheduleBaseline)
    private readonly baselineRepository: Repository<ScheduleBaseline>,
    @InjectRepository(WorkOrder)
    private readonly workOrderRepository: Repository<WorkOrder>,
    @InjectRepository(NcrRecord)
    private readonly ncrRepository: Repository<NcrRecord>,
    @InjectRepository(TrialObservation)
    private readonly trialRepository: Repository<TrialObservation>,
    @InjectRepository(ProjectDesignLoad)
    private readonly designLoadRepository: Repository<ProjectDesignLoad>,
  ) {}

  protected requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for tenant-scoped telemetry extraction');
    }
    return tenantId;
  }

  /**
   * Retrieves tenant-isolated, strictly historical telemetry for a project as of a specific cutoff.
   * Enforces temporal boundary to prevent future leakage.
   */
  async extractAuthoritativeTelemetry(
    projectId: string,
    tenantId: string,
    cutoffDate?: Date | string,
  ): Promise<AuthoritativeTelemetryPayload> {
    const scopeTenant = this.requireTenant(tenantId);
    const cutoff = cutoffDate ? new Date(cutoffDate) : new Date();

    const project = await this.projectRepository.findOne({
      where: { id: projectId, tenantId: scopeTenant, deletedAt: IsNull() },
    });

    if (!project) {
      throw new NotFoundException(
        `Project ${projectId} not found for tenant ${scopeTenant}.`,
      );
    }

    // 1. Baselines created up to cutoff
    const baselines = await this.baselineRepository.find({
      where: {
        projectId,
        tenantId: scopeTenant,
        createdAt: LessThanOrEqual(cutoff),
        deletedAt: IsNull(),
      },
      order: { version: 'DESC' },
    });

    // 2. Milestones created up to cutoff
    const allMilestones = await this.milestoneRepository.find({
      where: { projectId, tenantId: scopeTenant, deletedAt: IsNull() },
    });
    const milestones = allMilestones.filter((m) => new Date(m.createdAt) <= cutoff);
    const futureMilestonesCount = allMilestones.length - milestones.length;

    // 3. Work orders created up to cutoff
    const allWorkOrders = await this.workOrderRepository.find({
      where: { projectId, tenantId: scopeTenant, deletedAt: IsNull() },
    });
    const workOrders = allWorkOrders.filter((w) => new Date(w.createdAt) <= cutoff);
    const futureWorkOrdersCount = allWorkOrders.length - workOrders.length;

    // 4. NCR records created up to cutoff
    const allNcrs = await this.ncrRepository.find({
      where: { projectId, tenantId: scopeTenant, deletedAt: IsNull() },
    });
    const ncrs = allNcrs.filter((n) => new Date(n.createdAt) <= cutoff);
    const futureNcrsCount = allNcrs.length - ncrs.length;

    // 5. Trials created up to cutoff
    const allTrials = await this.trialRepository.find({
      where: { projectId, tenantId: scopeTenant, deletedAt: IsNull() },
    });
    const trials = allTrials.filter((t) => new Date(t.createdAt) <= cutoff);
    const futureTrialsCount = allTrials.length - trials.length;

    // 6. Design loads created up to cutoff
    const designLoads = await this.designLoadRepository.find({
      where: {
        projectId,
        tenantId: scopeTenant,
        createdAt: LessThanOrEqual(cutoff),
        deletedAt: IsNull(),
      },
    });

    // 7. Compute deterministic source hash
    const sourceSignature = JSON.stringify({
      tenantId: scopeTenant,
      projectId,
      cutoff: cutoff.toISOString(),
      mIds: milestones.map((m) => m.id).sort(),
      wIds: workOrders.map((w) => w.id).sort(),
      nIds: ncrs.map((n) => n.id).sort(),
      tIds: trials.map((t) => t.id).sort(),
      bIds: baselines.map((b) => b.id).sort(),
    });
    const sourceHash = createHash('sha256').update(sourceSignature).digest('hex');

    return {
      project,
      milestones,
      baselines,
      workOrders,
      ncrs,
      trials,
      designLoads,
      predictionCutoff: cutoff,
      sourceHash,
      futureExcludedCounts: {
        milestones: futureMilestonesCount,
        workOrders: futureWorkOrdersCount,
        ncrs: futureNcrsCount,
        trials: futureTrialsCount,
      },
    };
  }
}
