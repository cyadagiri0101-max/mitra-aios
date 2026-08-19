import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ServiceLineageService } from './service-lineage.service';
import { Project } from '../../project/entities/project.entity';
import { DispatchPlan } from '../../dispatch/entities/dispatchplan.entity';
import { ServiceInstallation } from '../entities/serviceinstallation.entity';
import { ServiceWarranty } from '../entities/servicewarranty.entity';
import { ServiceRequest } from '../entities/servicerequest.entity';
import { ServiceVisit } from '../entities/servicevisit.entity';
import { ServiceWarrantyClaim } from '../entities/servicewarrantyclaim.entity';

const makeRepo = () => ({ find: jest.fn(), findOne: jest.fn() });

describe('ServiceLineageService — W6 project digital thread', () => {
  let service: ServiceLineageService;
  const repos: Record<string, ReturnType<typeof makeRepo>> = {};

  const seed = () => {
    repos.project.findOne.mockResolvedValue({
      id: 'proj-1',
      name: 'Tooling G10 Lifecycle Die',
      projectNumber: 'PRJ-G10-001',
      tenantId: 'tenant-1',
    });
    repos.dispatch.find.mockResolvedValue([
      { id: 'dispatch-1', projectId: 'proj-1', status: 'DELIVERED' },
      { id: 'dispatch-2', projectId: 'proj-1', status: 'PLANNING' },
    ]);
    repos.installation.find.mockResolvedValue([
      { id: 'inst-1', projectId: 'proj-1', status: 'COMPLETED' },
    ]);
    repos.warranty.find.mockResolvedValue([
      { id: 'warranty-1', projectId: 'proj-1', status: 'ACTIVE' },
    ]);
    repos.request.find.mockResolvedValue([
      { id: 'sr-1', projectId: 'proj-1', status: 'RESOLVED' },
    ]);
    repos.visit.find.mockResolvedValue([
      { id: 'visit-1', projectId: 'proj-1', serviceRequestId: 'sr-1' },
    ]);
    repos.claim.find.mockResolvedValue([
      { id: 'claim-1', projectId: 'proj-1', status: 'APPROVED' },
    ]);
  };

  beforeEach(async () => {
    for (const key of Object.keys(repos)) delete repos[key];
    const entityKeys = {
      project: Project,
      dispatch: DispatchPlan,
      installation: ServiceInstallation,
      warranty: ServiceWarranty,
      request: ServiceRequest,
      visit: ServiceVisit,
      claim: ServiceWarrantyClaim,
    };
    const providers: any[] = [ServiceLineageService];
    for (const [key, entity] of Object.entries(entityKeys)) {
      repos[key] = makeRepo();
      providers.push({ provide: getRepositoryToken(entity), useValue: repos[key] });
    }
    const module: TestingModule = await Test.createTestingModule({ providers }).compile();
    service = module.get<ServiceLineageService>(ServiceLineageService);
    jest.clearAllMocks();
    seed();
  });

  it('assembles the contiguous project-to-service digital thread', async () => {
    const lineage = await service.getProjectServiceLineage('proj-1', 'tenant-1');
    expect(lineage.projectId).toBe('proj-1');
    expect(lineage.projectName).toBe('Tooling G10 Lifecycle Die');
    expect(lineage.projectCode).toBe('PRJ-G10-001');
    expect(lineage.dispatches).toHaveLength(2);
    expect(lineage.installations).toHaveLength(1);
    expect(lineage.warranties).toHaveLength(1);
    expect(lineage.serviceRequests).toHaveLength(1);
    expect(lineage.visits).toHaveLength(1);
    expect(lineage.claims).toHaveLength(1);
  });

  it('computes lineage metrics from real records', async () => {
    const lineage = await service.getProjectServiceLineage('proj-1', 'tenant-1');
    expect(lineage.metrics).toEqual({
      totalDispatches: 2,
      deliveredDispatches: 1,
      totalInstallations: 1,
      completedInstallations: 1,
      activeWarranties: 1,
      totalServiceRequests: 1,
      openServiceRequests: 0,
      resolvedServiceRequests: 1,
      totalVisits: 1,
      totalClaims: 1,
      approvedClaims: 1,
    });
  });

  it('scopes every query to project + tenant', async () => {
    await service.getProjectServiceLineage('proj-1', 'tenant-1');
    expect(repos.project.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'proj-1', tenantId: 'tenant-1' }) }),
    );
    for (const key of ['dispatch', 'installation', 'warranty', 'request', 'visit', 'claim']) {
      expect(repos[key].find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ projectId: 'proj-1', tenantId: 'tenant-1' }) }),
      );
    }
  });

  it('fails closed with 404 for cross-tenant project lineage', async () => {
    repos.project.findOne.mockResolvedValue(null);
    await expect(service.getProjectServiceLineage('proj-1', 'tenant-2')).rejects.toThrow(NotFoundException);
    for (const key of ['dispatch', 'installation', 'warranty', 'request', 'visit', 'claim']) {
      expect(repos[key].find).not.toHaveBeenCalled();
    }
  });
});