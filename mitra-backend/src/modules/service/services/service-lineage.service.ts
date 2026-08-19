import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceInstallation } from '../entities/serviceinstallation.entity';
import { ServiceWarranty } from '../entities/servicewarranty.entity';
import { ServiceWarrantyClaim } from '../entities/servicewarrantyclaim.entity';
import { ServiceRequest } from '../entities/servicerequest.entity';
import { ServiceVisit } from '../entities/servicevisit.entity';
import { DispatchPlan } from '../../dispatch/entities/dispatchplan.entity';
import { Project } from '../../project/entities/project.entity';

export interface ProjectServiceLineageDto {
  projectId: string;
  projectName?: string;
  projectCode?: string;
  dispatches: DispatchPlan[];
  installations: ServiceInstallation[];
  warranties: ServiceWarranty[];
  serviceRequests: ServiceRequest[];
  visits: ServiceVisit[];
  claims: ServiceWarrantyClaim[];
  metrics: {
    totalDispatches: number;
    deliveredDispatches: number;
    totalInstallations: number;
    completedInstallations: number;
    activeWarranties: number;
    totalServiceRequests: number;
    openServiceRequests: number;
    resolvedServiceRequests: number;
    totalVisits: number;
    totalClaims: number;
    approvedClaims: number;
  };
}

@Injectable()
export class ServiceLineageService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(DispatchPlan)
    private readonly dispatchRepo: Repository<DispatchPlan>,
    @InjectRepository(ServiceInstallation)
    private readonly installationRepo: Repository<ServiceInstallation>,
    @InjectRepository(ServiceWarranty)
    private readonly warrantyRepo: Repository<ServiceWarranty>,
    @InjectRepository(ServiceRequest)
    private readonly requestRepo: Repository<ServiceRequest>,
    @InjectRepository(ServiceVisit)
    private readonly visitRepo: Repository<ServiceVisit>,
    @InjectRepository(ServiceWarrantyClaim)
    private readonly claimRepo: Repository<ServiceWarrantyClaim>,
  ) {}

  async getProjectServiceLineage(projectId: string, tenantId: string): Promise<ProjectServiceLineageDto> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId, tenantId },
    });
    if (!project) {
      throw new NotFoundException(`Project not found with ID '${projectId}' for tenant`);
    }

    const [
      dispatches,
      installations,
      warranties,
      serviceRequests,
      visits,
      claims,
    ] = await Promise.all([
      this.dispatchRepo.find({
        where: { projectId, tenantId },
        order: { createdAt: 'ASC' },
      }),
      this.installationRepo.find({
        where: { projectId, tenantId },
        order: { createdAt: 'ASC' },
      }),
      this.warrantyRepo.find({
        where: { projectId, tenantId },
        order: { createdAt: 'ASC' },
      }),
      this.requestRepo.find({
        where: { projectId, tenantId },
        order: { createdAt: 'ASC' },
      }),
      this.visitRepo.find({
        where: { projectId, tenantId },
        order: { createdAt: 'ASC' },
      }),
      this.claimRepo.find({
        where: { projectId, tenantId },
        order: { createdAt: 'ASC' },
      }),
    ]);

    const metrics = {
      totalDispatches: dispatches.length,
      deliveredDispatches: dispatches.filter((d) => d.status === 'DELIVERED').length,
      totalInstallations: installations.length,
      completedInstallations: installations.filter((i) => i.status === 'COMPLETED').length,
      activeWarranties: warranties.filter((w) => w.status === 'ACTIVE').length,
      totalServiceRequests: serviceRequests.length,
      openServiceRequests: serviceRequests.filter((r) => r.status === 'OPEN' || r.status === 'IN_PROGRESS' || r.status === 'ACKNOWLEDGED').length,
      resolvedServiceRequests: serviceRequests.filter((r) => r.status === 'RESOLVED' || r.status === 'CLOSED').length,
      totalVisits: visits.length,
      totalClaims: claims.length,
      approvedClaims: claims.filter((c) => c.status === 'APPROVED').length,
    };

    return {
      projectId: project.id,
      projectName: project.name,
      projectCode: project.projectNumber,
      dispatches,
      installations,
      warranties,
      serviceRequests,
      visits,
      claims,
      metrics,
    };
  }
}
