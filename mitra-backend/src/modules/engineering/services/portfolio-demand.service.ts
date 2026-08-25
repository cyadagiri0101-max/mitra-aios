import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DesignWorkPackage } from '../entities/design-work-package.entity';
import { DesignComponent } from '../entities/design-component.entity';
import { DesignComponentDeliverable } from '../entities/design-component-deliverable.entity';
import { DesignProjectComplexity } from '../entities/design-project-complexity.entity';
import { DesignHistoricalWorkload } from '../entities/design-historical-workload.entity';

export interface ProjectDemandBreakdown {
  projectId: string;
  projectName: string;
  complexityTier: string;
  estimatedTotalHours: number;
  remainingDemandHours: number;
  workPackagesCount: number;
  totalDeliverablesCount: number;
  completedDeliverablesCount: number;
  pendingDeliverablesCount: number;
  uncalibratedDeliverablesCount: number;
  varianceMultiplier: number;
}

export interface PortfolioDemandSummary {
  tenantId: string;
  totalDemandHours: number;
  totalDeliverablesCount: number;
  totalPendingDeliverablesCount: number;
  activeProjectsCount: number;
  uncalibratedDeliverablesCount: number;
  projects: ProjectDemandBreakdown[];
}

@Injectable()
export class PortfolioDemandService {
  private readonly logger = new Logger(PortfolioDemandService.name);

  constructor(
    @InjectRepository(DesignWorkPackage)
    private readonly workPackageRepo: Repository<DesignWorkPackage>,
    @InjectRepository(DesignComponent)
    private readonly componentRepo: Repository<DesignComponent>,
    @InjectRepository(DesignComponentDeliverable)
    private readonly deliverableRepo: Repository<DesignComponentDeliverable>,
    @InjectRepository(DesignProjectComplexity)
    private readonly complexityRepo: Repository<DesignProjectComplexity>,
    @InjectRepository(DesignHistoricalWorkload)
    private readonly historicalRepo: Repository<DesignHistoricalWorkload>,
  ) {}

  public async calculatePortfolioDemand(
    tenantId: string,
    filterProjectIds?: string[],
  ): Promise<PortfolioDemandSummary> {
    this.logger.log(`Calculating portfolio demand for tenant: ${tenantId}`);

    // 1. Fetch work packages
    const wpQuery = this.workPackageRepo.createQueryBuilder('wp')
      .where('wp.tenant_id = :tenantId', { tenantId });
    if (filterProjectIds && filterProjectIds.length > 0) {
      wpQuery.andWhere('wp.project_id IN (:...filterProjectIds)', { filterProjectIds });
    }
    const workPackages = await wpQuery.getMany();

    // 2. Fetch project complexity records
    const complexityRecords = await this.complexityRepo.find({ where: { tenantId } });
    const complexityMap = new Map<string, DesignProjectComplexity>();
    complexityRecords.forEach((c) => complexityMap.set(c.projectId, c));

    // 3. Fetch historical calibration records
    const historicalRecords = await this.historicalRepo.find({ where: { tenantId } });
    const varianceMap = new Map<string, number>();
    historicalRecords.forEach((h) => {
      if (h.variancePercentage !== undefined && h.variancePercentage !== null) {
        const factor = 1.0 + Number(h.variancePercentage) / 100.0;
        varianceMap.set(h.projectId, factor);
      }
    });

    // 4. Fetch components with deliverables
    const compQuery = this.componentRepo.createQueryBuilder('c')
      .leftJoinAndSelect('c.deliverables', 'd')
      .where('c.tenant_id = :tenantId', { tenantId });
    if (filterProjectIds && filterProjectIds.length > 0) {
      compQuery.andWhere('c.project_id IN (:...filterProjectIds)', { filterProjectIds });
    }
    const components = await compQuery.getMany();

    // Group by project
    const projectMap = new Map<string, {
      workPackages: DesignWorkPackage[];
      deliverables: DesignComponentDeliverable[];
    }>();

    workPackages.forEach((wp) => {
      if (!projectMap.has(wp.projectId)) {
        projectMap.set(wp.projectId, { workPackages: [], deliverables: [] });
      }
      projectMap.get(wp.projectId)!.workPackages.push(wp);
    });

    components.forEach((c) => {
      if (!projectMap.has(c.projectId)) {
        projectMap.set(c.projectId, { workPackages: [], deliverables: [] });
      }
      if (c.deliverables) {
        projectMap.get(c.projectId)!.deliverables.push(...c.deliverables);
      }
    });

    let totalDemandHours = 0;
    let totalDeliverablesCount = 0;
    let totalPendingDeliverablesCount = 0;
    let uncalibratedDeliverablesCount = 0;
    const projectBreakdowns: ProjectDemandBreakdown[] = [];

    for (const [projectId, data] of projectMap.entries()) {
      const complexity = complexityMap.get(projectId);
      const complexityTier = complexity ? complexity.moldSizeClass || 'MEDIUM' : 'MEDIUM';
      const workloadMult = complexity ? Number(complexity.workloadMultiplier) || 1.0 : 1.0;
      const varianceFactor = varianceMap.get(projectId) || workloadMult;

      const totalDelivs = data.deliverables.length;
      const completedDelivs = data.deliverables.filter(
        (d) => d.status === 'COMPLETED',
      ).length;
      const pendingDelivs = totalDelivs - completedDelivs;

      let projectDemandHours = 0;
      let uncalibratedInProject = 0;

      data.deliverables.forEach((d) => {
        const plannedUnits = Number(d.plannedUnits) || 0;
        if (plannedUnits > 0) {
          if (d.status !== 'COMPLETED') {
            // Convert workload units to hours (1 unit = ~8 engineering hours)
            projectDemandHours += plannedUnits * 8.0 * varianceFactor;
          }
        } else {
          uncalibratedInProject++;
          if (d.status !== 'COMPLETED') {
            projectDemandHours += 8.0 * varianceFactor; // Nominal uncalibrated unit
          }
        }
      });

      // If work packages exist, incorporate stage planned workload units
      if (projectDemandHours === 0 && data.workPackages.length > 0) {
        data.workPackages.forEach((wp) => {
          if (wp.stagesState && Array.isArray(wp.stagesState)) {
            wp.stagesState.forEach((st: any) => {
              if (st.status !== 'COMPLETED') {
                const stageUnits = Number(st.plannedWorkloadUnits) || 1.0;
                projectDemandHours += stageUnits * 8.0 * varianceFactor;
              }
            });
          } else {
            const wpUnits = Number(wp.plannedWorkloadUnits) || 5.0;
            projectDemandHours += wpUnits * 8.0 * varianceFactor;
          }
        });
      }

      totalDemandHours += projectDemandHours;
      totalDeliverablesCount += totalDelivs;
      totalPendingDeliverablesCount += pendingDelivs;
      uncalibratedDeliverablesCount += uncalibratedInProject;

      projectBreakdowns.push({
        projectId,
        projectName: `Project ${projectId}`,
        complexityTier,
        estimatedTotalHours: Math.round(projectDemandHours * 100) / 100,
        remainingDemandHours: Math.round(projectDemandHours * 100) / 100,
        workPackagesCount: data.workPackages.length,
        totalDeliverablesCount: totalDelivs,
        completedDeliverablesCount: completedDelivs,
        pendingDeliverablesCount: pendingDelivs,
        uncalibratedDeliverablesCount: uncalibratedInProject,
        varianceMultiplier: Math.round(varianceFactor * 100) / 100,
      });
    }

    return {
      tenantId,
      totalDemandHours: Math.round(totalDemandHours * 100) / 100,
      totalDeliverablesCount,
      totalPendingDeliverablesCount,
      activeProjectsCount: projectBreakdowns.length,
      uncalibratedDeliverablesCount,
      projects: projectBreakdowns,
    };
  }
}
