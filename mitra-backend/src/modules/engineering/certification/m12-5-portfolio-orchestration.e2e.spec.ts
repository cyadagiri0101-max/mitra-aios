import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PortfolioSnapshotService } from '../services/portfolio-snapshot.service';
import { PortfolioDemandService } from '../services/portfolio-demand.service';
import { PortfolioCapacityService } from '../services/portfolio-capacity.service';
import { PortfolioBalancingService } from '../services/portfolio-balancing.service';
import { PortfolioScenarioService } from '../services/portfolio-scenario.service';
import { PortfolioOrchestrationController } from '../controllers/portfolio-orchestration.controller';
import { EnterprisePortfolioSnapshot } from '../entities/enterprise-portfolio-snapshot.entity';
import { CrossProjectAllocation } from '../entities/cross-project-allocation.entity';
import { DesignWorkPackage } from '../entities/design-work-package.entity';
import { DesignComponent } from '../entities/design-component.entity';
import { DesignComponentDeliverable } from '../entities/design-component-deliverable.entity';
import { DesignProjectComplexity } from '../entities/design-project-complexity.entity';
import { DesignHistoricalWorkload } from '../entities/design-historical-workload.entity';
import { DesignEngineerProfile, EngineerSkillType } from '../entities/design-team-capacity.entity';
import { OutboxService } from '../../platform/services/outbox.service';
import { EngineeringEventBus } from '../services/engineering-event-bus.service';

describe('MITRA M12.5-P1 — Enterprise Portfolio Orchestration & Global Capacity Balancing Master Suite', () => {
  let controller: PortfolioOrchestrationController;
  let snapshotService: PortfolioSnapshotService;
  let demandService: PortfolioDemandService;
  let capacityService: PortfolioCapacityService;
  let balancingService: PortfolioBalancingService;
  let scenarioService: PortfolioScenarioService;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const otherTenantId = '99999999-9999-9999-9999-999999999999';

  let snapshotsDB: EnterprisePortfolioSnapshot[] = [];
  let allocationsDB: CrossProjectAllocation[] = [];
  let workPackagesDB: DesignWorkPackage[] = [];
  let componentsDB: DesignComponent[] = [];
  let deliverablesDB: DesignComponentDeliverable[] = [];
  let complexityDB: DesignProjectComplexity[] = [];
  let historicalDB: DesignHistoricalWorkload[] = [];
  let engineersDB: DesignEngineerProfile[] = [];

  const mockSnapshotRepo = {
    findOne: jest.fn().mockImplementation(({ where, order }) => {
      const filtered = snapshotsDB.filter((s) => s.tenantId === where.tenantId);
      if (order && order.createdAt === 'DESC') {
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return Promise.resolve(filtered[0] || null);
    }),
    find: jest.fn().mockImplementation(({ where }) => {
      return Promise.resolve(snapshotsDB.filter((s) => s.tenantId === where.tenantId));
    }),
    create: jest.fn().mockImplementation((dto) => ({
      id: `snap-${Date.now()}-${Math.random()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...dto,
    })),
    save: jest.fn().mockImplementation((entity) => {
      snapshotsDB.push(entity);
      return Promise.resolve(entity);
    }),
  };

  const mockAllocationRepo = {
    find: jest.fn().mockImplementation(({ where }) => {
      return Promise.resolve(
        allocationsDB.filter((a) => {
          let match = a.tenantId === where.tenantId;
          if (where.allocationStatus) match = match && a.allocationStatus === where.allocationStatus;
          if (where.projectId) match = match && a.projectId === where.projectId;
          if (where.engineerId) match = match && a.engineerId === where.engineerId;
          return match;
        }),
      );
    }),
    findOne: jest.fn().mockImplementation(({ where }) => {
      const a = allocationsDB.find((item) => item.id === where.id && item.tenantId === where.tenantId);
      return Promise.resolve(a || null);
    }),
    create: jest.fn().mockImplementation((dto) => ({
      id: `alloc-${Date.now()}-${Math.random()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...dto,
    })),
    save: jest.fn().mockImplementation((entity) => {
      const idx = allocationsDB.findIndex((a) => a.id === entity.id);
      if (idx >= 0) {
        allocationsDB[idx] = entity;
      } else {
        allocationsDB.push(entity);
      }
      return Promise.resolve(entity);
    }),
    createQueryBuilder: jest.fn().mockImplementation(() => {
      let tId = '';
      let pId = '';
      let eId = '';
      const builder: any = {};
      builder.where = jest.fn().mockImplementation((clause, params) => {
        tId = params.tenantId;
        return builder;
      });
      builder.andWhere = jest.fn().mockImplementation((clause, params) => {
        if (params.projectId) pId = params.projectId;
        if (params.engineerId) eId = params.engineerId;
        return builder;
      });
      builder.orderBy = jest.fn().mockReturnValue(builder);
      builder.getMany = jest.fn().mockImplementation(() => {
        return Promise.resolve(
          allocationsDB.filter((a) => {
            let match = a.tenantId === tId;
            if (pId) match = match && a.projectId === pId;
            if (eId) match = match && a.engineerId === eId;
            return match;
          }),
        );
      });
      return builder;
    }),
  };

  const mockWorkPackageRepo = {
    createQueryBuilder: jest.fn().mockImplementation(() => {
      let tId = '';
      let pIds: string[] = [];
      const builder: any = {};
      builder.where = jest.fn().mockImplementation((clause, params) => {
        tId = params.tenantId;
        return builder;
      });
      builder.andWhere = jest.fn().mockImplementation((clause, params) => {
        if (params.filterProjectIds) pIds = params.filterProjectIds;
        return builder;
      });
      builder.getMany = jest.fn().mockImplementation(() => {
        return Promise.resolve(
          workPackagesDB.filter((wp) => {
            let match = wp.tenantId === tId;
            if (pIds.length > 0) match = match && pIds.includes(wp.projectId);
            return match;
          }),
        );
      });
      return builder;
    }),
  };

  const mockComponentRepo = {
    createQueryBuilder: jest.fn().mockImplementation(() => {
      let tId = '';
      let pIds: string[] = [];
      const builder: any = {};
      builder.leftJoinAndSelect = jest.fn().mockReturnValue(builder);
      builder.where = jest.fn().mockImplementation((clause, params) => {
        tId = params.tenantId;
        return builder;
      });
      builder.andWhere = jest.fn().mockImplementation((clause, params) => {
        if (params.filterProjectIds) pIds = params.filterProjectIds;
        return builder;
      });
      builder.getMany = jest.fn().mockImplementation(() => {
        return Promise.resolve(
          componentsDB.filter((c) => {
            let match = c.tenantId === tId;
            if (pIds.length > 0) match = match && pIds.includes(c.projectId);
            return match;
          }),
        );
      });
      return builder;
    }),
  };

  const mockDeliverableRepo = {
    find: jest.fn().mockImplementation(({ where }) => {
      return Promise.resolve(deliverablesDB.filter((d) => d.tenantId === where.tenantId));
    }),
  };

  const mockComplexityRepo = {
    find: jest.fn().mockImplementation(({ where }) => {
      return Promise.resolve(complexityDB.filter((c) => c.tenantId === where.tenantId));
    }),
  };

  const mockHistoricalRepo = {
    find: jest.fn().mockImplementation(({ where }) => {
      return Promise.resolve(historicalDB.filter((h) => h.tenantId === where.tenantId));
    }),
  };

  const mockEngineerRepo = {
    createQueryBuilder: jest.fn().mockImplementation(() => {
      let tId = '';
      let rFilter = '';
      const builder: any = {};
      builder.where = jest.fn().mockImplementation((clause, params) => {
        tId = params.tenantId;
        return builder;
      });
      builder.andWhere = jest.fn().mockImplementation((clause, params) => {
        if (params.roleFilter) rFilter = params.roleFilter;
        return builder;
      });
      builder.getMany = jest.fn().mockImplementation(() => {
        return Promise.resolve(
          engineersDB.filter((e) => {
            let match = e.tenantId === tId;
            if (rFilter) match = match && e.proficiencyLevel === rFilter;
            return match;
          }),
        );
      });
      return builder;
    }),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortfolioOrchestrationController],
      providers: [
        PortfolioSnapshotService,
        PortfolioDemandService,
        PortfolioCapacityService,
        PortfolioBalancingService,
        PortfolioScenarioService,
        { provide: getRepositoryToken(EnterprisePortfolioSnapshot), useValue: mockSnapshotRepo },
        { provide: getRepositoryToken(CrossProjectAllocation), useValue: mockAllocationRepo },
        { provide: getRepositoryToken(DesignWorkPackage), useValue: mockWorkPackageRepo },
        { provide: getRepositoryToken(DesignComponent), useValue: mockComponentRepo },
        { provide: getRepositoryToken(DesignComponentDeliverable), useValue: mockDeliverableRepo },
        { provide: getRepositoryToken(DesignProjectComplexity), useValue: mockComplexityRepo },
        { provide: getRepositoryToken(DesignHistoricalWorkload), useValue: mockHistoricalRepo },
        { provide: getRepositoryToken(DesignEngineerProfile), useValue: mockEngineerRepo },
        { provide: OutboxService, useValue: { append: jest.fn().mockResolvedValue({ id: 'outbox-1' }) } },
        { provide: EngineeringEventBus, useValue: new EngineeringEventBus() },
      ],
    })
      .overrideGuard(require('@nestjs/throttler').ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(require('../../../common/guards/jwt-auth.guard').JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(require('../../../common/guards/roles.guard').RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PortfolioOrchestrationController>(PortfolioOrchestrationController);
    snapshotService = module.get<PortfolioSnapshotService>(PortfolioSnapshotService);
    demandService = module.get<PortfolioDemandService>(PortfolioDemandService);
    capacityService = module.get<PortfolioCapacityService>(PortfolioCapacityService);
    balancingService = module.get<PortfolioBalancingService>(PortfolioBalancingService);
    scenarioService = module.get<PortfolioScenarioService>(PortfolioScenarioService);
  });

  beforeEach(() => {
    snapshotsDB = [];
    allocationsDB = [];
    workPackagesDB = [];
    componentsDB = [];
    deliverablesDB = [];
    complexityDB = [];
    historicalDB = [];
    engineersDB = [];

    // Projects: BM289 & BM331
    complexityDB.push({
      id: 'cpx-1',
      tenantId,
      projectId: 'BM289',
      moldType: 'INJECTION_MOLD',
      cavityCount: 2,
      moldSizeClass: 'LARGE',
      sliderCount: 4,
      lifterCount: 2,
      insertCount: 8,
      coolingComplexityLevel: 'HIGH',
      gatingComplexityLevel: 'HOT_RUNNER',
      toleranceClass: 'PRECISION',
      surfaceFinishClass: 'GRAINED',
      specialMaterialFactors: {},
      calculatedComplexityScore: 78.5,
      workloadMultiplier: 1.25,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    complexityDB.push({
      id: 'cpx-2',
      tenantId,
      projectId: 'BM331',
      moldType: 'COMPRESSION_MOLD',
      cavityCount: 1,
      moldSizeClass: 'VERY_LARGE',
      sliderCount: 6,
      lifterCount: 4,
      insertCount: 12,
      coolingComplexityLevel: 'CONFORMAL',
      gatingComplexityLevel: 'VALVE_GATE',
      toleranceClass: 'ULTRA_PRECISION',
      surfaceFinishClass: 'POLISHED',
      specialMaterialFactors: {},
      calculatedComplexityScore: 92.0,
      workloadMultiplier: 1.45,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Deliverables for BM289
    const comp1: any = {
      id: 'comp-bm289-01',
      tenantId,
      projectId: 'BM289',
      componentCode: 'CAV_INSERT_01',
      name: 'Cavity Insert Left',
      componentType: 'CAVITY_INSERT',
      deliverables: [
        {
          id: 'deliv-1',
          tenantId,
          componentId: 'comp-bm289-01',
          name: '3D Cavity Solid Model',
          deliverableType: '3D_DEVELOPMENT',
          plannedUnits: 5.0,
          actualUnits: 0.0,
          status: 'IN_PROGRESS',
        },
        {
          id: 'deliv-2',
          tenantId,
          componentId: 'comp-bm289-01',
          name: '2D Manufacturing Drawing',
          deliverableType: 'DETAILING',
          plannedUnits: 3.0,
          actualUnits: 0.0,
          status: 'NOT_STARTED',
        },
      ],
    };
    componentsDB.push(comp1);

    // Deliverables for BM331
    const comp2: any = {
      id: 'comp-bm331-01',
      tenantId,
      projectId: 'BM331',
      componentCode: 'BUMP_CORE_01',
      name: 'Main Bumper Core Block',
      componentType: 'CORE_PLATE',
      deliverables: [
        {
          id: 'deliv-3',
          tenantId,
          componentId: 'comp-bm331-01',
          name: '3D Core Topology',
          deliverableType: '3D_DEVELOPMENT',
          plannedUnits: 8.0,
          actualUnits: 0.0,
          status: 'IN_PROGRESS',
        },
        {
          id: 'deliv-4',
          tenantId,
          componentId: 'comp-bm331-01',
          name: 'Electrode Extraction Map',
          deliverableType: 'ELECTRODE_EXTRACTION',
          plannedUnits: 4.0,
          actualUnits: 0.0,
          status: 'NOT_STARTED',
        },
      ],
    };
    componentsDB.push(comp2);

    // Engineers
    engineersDB.push({
      id: 'eng-uuid-1',
      tenantId,
      engineerCode: 'ENG_SR_01',
      name: 'Rajesh Sharma',
      email: 'rajesh@mitra.com',
      proficiencyLevel: 'PRINCIPAL',
      weeklyCapacityHours: 40.0,
      currentUtilizationPercentage: 112.5,
      status: 'OVERLOADED',
      primarySkills: [
        { skill: EngineerSkillType.MOLD_DESIGN, level: 'PRINCIPAL', yearsExperience: 14 },
        { skill: EngineerSkillType.CAVITY_MODELING, level: 'SENIOR', yearsExperience: 10 },
      ],
      activeAssignments: [
        { projectId: 'BM289', packageId: 'WP-1', stageName: 'MOLD_DESIGN', allocatedWeeklyHours: 25.0, startDate: '2026-08-01', endDate: '2026-09-01' },
        { projectId: 'BM331', packageId: 'WP-2', stageName: 'CAVITY_MODEL', allocatedWeeklyHours: 20.0, startDate: '2026-08-15', endDate: '2026-09-15' },
      ],
    } as any);

    engineersDB.push({
      id: 'eng-uuid-2',
      tenantId,
      engineerCode: 'ENG_MID_02',
      name: 'Amit Patel',
      email: 'amit@mitra.com',
      proficiencyLevel: 'MID',
      weeklyCapacityHours: 40.0,
      currentUtilizationPercentage: 50.0,
      status: 'AVAILABLE',
      primarySkills: [
        { skill: EngineerSkillType.CAVITY_MODELING, level: 'MID', yearsExperience: 4 },
        { skill: EngineerSkillType.MOLD_DESIGN, level: 'MID', yearsExperience: 3 },
      ],
      activeAssignments: [
        { projectId: 'BM289', packageId: 'WP-1', stageName: 'CAVITY_MODEL', allocatedWeeklyHours: 20.0, startDate: '2026-08-01', endDate: '2026-09-01' },
      ],
    } as any);

    // Active Cross Project Allocations
    allocationsDB.push({
      id: 'alloc-1',
      tenantId,
      projectId: 'BM289',
      workPackageId: 'WP-1',
      deliverableId: 'deliv-1',
      engineerId: 'ENG_SR_01',
      engineerName: 'Rajesh Sharma',
      allocationRole: 'LEAD_DESIGNER',
      allocatedHoursPerWeek: 25.0,
      allocatedWorkloadUnits: 3.125,
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-09-01'),
      allocationStatus: 'ACTIVE',
      skillFitScore: 98.0,
      source: 'MANUAL_ASSIGNMENT',
      reviewedBy: 'CHIEF_ENGINEER',
      reviewRationale: 'Assigned to complex door mold gating',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    allocationsDB.push({
      id: 'alloc-2',
      tenantId,
      projectId: 'BM331',
      workPackageId: 'WP-2',
      deliverableId: 'deliv-3',
      engineerId: 'ENG_SR_01',
      engineerName: 'Rajesh Sharma',
      allocationRole: 'LEAD_DESIGNER',
      allocatedHoursPerWeek: 20.0,
      allocatedWorkloadUnits: 2.5,
      startDate: new Date('2026-08-15'),
      endDate: new Date('2026-09-15'),
      allocationStatus: 'ACTIVE',
      skillFitScore: 95.0,
      source: 'MANUAL_ASSIGNMENT',
      reviewedBy: 'CHIEF_ENGINEER',
      reviewRationale: 'Assigned to bumper mold core topology',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    allocationsDB.push({
      id: 'alloc-3',
      tenantId,
      projectId: 'BM289',
      workPackageId: 'WP-1',
      deliverableId: 'deliv-2',
      engineerId: 'ENG_MID_02',
      engineerName: 'Amit Patel',
      allocationRole: 'TOOL_DESIGNER',
      allocatedHoursPerWeek: 20.0,
      allocatedWorkloadUnits: 2.5,
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-09-01'),
      allocationStatus: 'ACTIVE',
      skillFitScore: 88.0,
      source: 'MANUAL_ASSIGNMENT',
      reviewedBy: 'CHIEF_ENGINEER',
      reviewRationale: 'Assigned to standard mold base drafting',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  describe('1. Portfolio Demand Aggregation & Mathematical Modeling', () => {
    it('should accurately aggregate demand across BM289 and BM331 with complexity multipliers', async () => {
      const demand = await demandService.calculatePortfolioDemand(tenantId);

      expect(demand.tenantId).toBe(tenantId);
      expect(demand.activeProjectsCount).toBe(2);
      expect(demand.totalDeliverablesCount).toBe(4);
      expect(demand.totalPendingDeliverablesCount).toBe(4);
      expect(demand.totalDemandHours).toBeCloseTo(219.2, 1);

      const bm289 = demand.projects.find((p) => p.projectId === 'BM289');
      expect(bm289).toBeDefined();
      expect(bm289?.varianceMultiplier).toBe(1.25);
      expect(bm289?.estimatedTotalHours).toBe(80.0);
    });

    it('should filter demand by specific project IDs when requested', async () => {
      const demand = await demandService.calculatePortfolioDemand(tenantId, ['BM289']);

      expect(demand.activeProjectsCount).toBe(1);
      expect(demand.projects[0].projectId).toBe('BM289');
      expect(demand.totalDemandHours).toBe(80.0);
    });

    it('should gracefully handle empty project list without errors', async () => {
      const demand = await demandService.calculatePortfolioDemand(tenantId, ['NON_EXISTENT_PROJ']);
      expect(demand.activeProjectsCount).toBe(0);
      expect(demand.totalDemandHours).toBe(0);
    });
  });

  describe('2. Portfolio Capacity & Resource Utilization Modeling', () => {
    it('should calculate individual and overall utilization correctly', async () => {
      const capacity = await capacityService.calculatePortfolioCapacity(tenantId);

      expect(capacity.totalEngineersCount).toBe(2);
      expect(capacity.totalAvailableWeeklyCapacityHours).toBe(80.0);
      expect(capacity.totalAllocatedWeeklyCapacityHours).toBe(65.0);
      expect(capacity.overallUtilizationPercentage).toBe(81.25);
      expect(capacity.overloadedEngineersCount).toBe(1);
      expect(capacity.underutilizedEngineersCount).toBe(1);

      const seniorEng = capacity.engineers.find((e) => e.engineerId === 'ENG_SR_01');
      expect(seniorEng?.isOverloaded).toBe(true);
      expect(seniorEng?.utilizationPercentage).toBe(112.5);
      expect(seniorEng?.activeAllocations.length).toBe(2);
    });

    it('should filter capacity by engineer role proficiency', async () => {
      const capacity = await capacityService.calculatePortfolioCapacity(tenantId, 'PRINCIPAL');
      expect(capacity.totalEngineersCount).toBe(1);
      expect(capacity.engineers[0].engineerId).toBe('ENG_SR_01');
    });
  });

  describe('3. Deterministic Balancing & Bottleneck Analysis', () => {
    it('should detect engineer overload bottleneck and propose human-supervised rebalancing', async () => {
      const result = await balancingService.analyzeAndBalance(tenantId, 100.0);

      expect(result.tenantId).toBe(tenantId);
      expect(result.isAutonomousDecision).toBe(false);
      expect(result.bottlenecks.length).toBeGreaterThan(0);

      const overloadBtnk = result.bottlenecks.find((b) => b.type === 'ENGINEER_OVERLOAD');
      expect(overloadBtnk).toBeDefined();
      expect(overloadBtnk?.resourceId).toBe('ENG_SR_01');
      expect(overloadBtnk?.severity).toBe('MEDIUM');

      expect(result.recommendations.length).toBeGreaterThan(0);
      const rec = result.recommendations[0];
      expect(rec.isAutonomousDecision).toBe(false);
      expect(rec.type).toBe('REALLOCATE_ENGINEER');
      expect(rec.engineerId).toBe('ENG_MID_02');
      expect(rec.suggestedHours).toBe(5.0);
    });

    it('should return 100 health score when zero bottlenecks exist', async () => {
      // Release allocations to bring utilization to normal
      allocationsDB = [];
      // Empty engineers active assignments as well so utilization is 0%
      engineersDB.forEach((e) => (e.activeAssignments = []));

      const result = await balancingService.analyzeAndBalance(tenantId, 100.0);
      expect(result.overallHealthScore).toBe(100.0);
      expect(result.bottlenecks.length).toBe(0);
    });
  });

  describe('4. Non-Mutating What-If Scenario Simulations', () => {
    it('should accurately simulate engineer unavailability without altering repository state', async () => {
      const scenario = await scenarioService.simulateScenario(tenantId, {
        scenarioName: 'Lead Engineer Leave Scenario',
        unavailableEngineers: ['ENG_SR_01'],
      });

      expect(scenario.isAutonomousDecision).toBe(false);
      expect(scenario.baselineSummary.overloadedEngineersCount).toBe(1);
      expect(scenario.simulatedSummary.totalCapacityHours).toBe(40.0);
      expect(scenario.scenarioBottlenecks.length).toBe(1);
      expect(scenario.scenarioBottlenecks[0].type).toBe('ENGINEER_UNAVAILABLE');

      expect(allocationsDB.length).toBe(3);
      expect(allocationsDB[0].allocationStatus).toBe('ACTIVE');
    });

    it('should simulate project delays and prospective additions', async () => {
      const scenario = await scenarioService.simulateScenario(tenantId, {
        scenarioName: 'Q4 Program Shift',
        delayedProjects: [{ projectId: 'BM289', delayDays: 14 }],
        addedProjectIds: ['BM450_HEADLAMP'],
      });

      expect(scenario.deltas.demandHoursDelta).toBe(120.0);
      expect(scenario.affectedProjects.length).toBe(2);
    });

    it('should simulate capacity scaling multiplier across portfolio', async () => {
      const scenario = await scenarioService.simulateScenario(tenantId, {
        scenarioName: 'Overtime Authorized 1.25x',
        capacityMultiplier: 1.25,
      });

      expect(scenario.simulatedSummary.totalCapacityHours).toBe(100.0); // 80 * 1.25
      expect(scenario.deltas.capacityHoursDelta).toBe(20.0);
    });
  });

  describe('5. Authoritative Portfolio Snapshot Persistence & Retrieval', () => {
    it('should create and retrieve reproducible portfolio snapshots with audit trail', async () => {
      const created = await snapshotService.createSnapshot(tenantId, {
        snapshotName: 'M12.5 Baseline Snapshot',
        actorId: 'LEAD_PLANNER_01',
      });

      expect(created.id).toBeDefined();
      expect(created.tenantId).toBe(tenantId);
      expect(created.isAutonomousDecision).toBe(false);
      expect(created.demandSummary.totalDemandHours).toBeCloseTo(219.2, 1);
      expect(created.capacitySummary.overallUtilizationPercentage).toBe(81.25);
      expect(created.generatedBy).toBe('LEAD_PLANNER_01');

      const latest = await snapshotService.getLatestSnapshot(tenantId);
      expect(latest).toBeDefined();
      expect(latest?.id).toBe(created.id);
    });
  });

  describe('6. Cross-Project Allocation Management & Human Sign-Off', () => {
    it('should create, query, and update cross-project allocations with human rationale', async () => {
      const newAlloc = await snapshotService.createAllocation(
        tenantId,
        {
          projectId: 'BM331',
          engineerId: 'ENG_MID_02',
          engineerName: 'Amit Patel',
          allocationRole: 'ASSISTANT_DESIGNER',
          allocatedHoursPerWeek: 10.0,
          startDate: '2026-08-20',
          endDate: '2026-09-20',
          reviewRationale: 'Assigned to electrode modeling assist',
        },
        'CHIEF_TOOLING_ARCHITECT',
      );

      expect(newAlloc.id).toBeDefined();
      expect(newAlloc.allocationStatus).toBe('ACTIVE');
      expect(newAlloc.reviewedBy).toBe('CHIEF_TOOLING_ARCHITECT');

      const updated = await snapshotService.updateAllocationStatus(
        tenantId,
        newAlloc.id,
        {
          status: 'OVERRIDDEN',
          rationale: 'Project milestone completed ahead of schedule',
        },
        'CHIEF_TOOLING_ARCHITECT',
      );

      expect(updated.allocationStatus).toBe('OVERRIDDEN');
      expect(updated.reviewRationale).toBe('Project milestone completed ahead of schedule');
    });

    it('should throw NotFoundException on non-existent allocation update', async () => {
      await expect(
        snapshotService.updateAllocationStatus(
          tenantId,
          'non-existent-uuid',
          { status: 'RELEASED' },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should query allocations filtered by engineerId and projectId', async () => {
      const results = await snapshotService.getCrossProjectAllocations(tenantId, 'BM289', 'ENG_SR_01');
      expect(results.length).toBe(1);
      expect(results[0].projectId).toBe('BM289');
      expect(results[0].engineerId).toBe('ENG_SR_01');
    });
  });

  describe('7. Controller Endpoints & Request Routing Verification', () => {
    const mockReq = { user: { tenantId, userId: 'USER_M12_5_TEST', role: 'PLANNING' } };

    it('GET /api/engineering/portfolio/demand should return calculated demand via controller', async () => {
      const res = await controller.getPortfolioDemand({ timeframeDays: 90 }, mockReq);
      expect(res.tenantId).toBe(tenantId);
      expect(res.totalDemandHours).toBeCloseTo(219.2, 1);
    });

    it('GET /api/engineering/portfolio/capacity should return capacity breakdown via controller', async () => {
      const res = await controller.getPortfolioCapacity({ timeframeDays: 90 }, mockReq);
      expect(res.tenantId).toBe(tenantId);
      expect(res.totalEngineersCount).toBe(2);
    });

    it('GET /api/engineering/portfolio/bottlenecks should return bottlenecks via controller', async () => {
      const res = await controller.getPortfolioBottlenecks(mockReq);
      expect(res.tenantId).toBe(tenantId);
      expect(res.isAutonomousDecision).toBe(false);
    });

    it('POST /api/engineering/portfolio/snapshot should generate snapshot via controller', async () => {
      const res = await controller.createSnapshot({ snapshotName: 'Controller Triggered' }, mockReq);
      expect(res.id).toBeDefined();
      expect(res.snapshotName).toBe('Controller Triggered');
    });

    it('POST /api/engineering/portfolio/scenario/simulate should return what-if result via controller', async () => {
      const res = await controller.simulateScenario({ scenarioName: 'Test Controller Scenario' }, mockReq);
      expect(res.scenarioName).toBe('Test Controller Scenario');
      expect(res.isAutonomousDecision).toBe(false);
    });
  });

  describe('8. Security, Multi-Tenant Isolation & Failure Injection', () => {
    it('should strictly isolate data across distinct tenants', async () => {
      await snapshotService.createSnapshot(tenantId, {
        snapshotName: 'Tenant A Snapshot',
      });

      await snapshotService.createSnapshot(otherTenantId, {
        snapshotName: 'Tenant B Snapshot',
      });

      const tenantASnapshot = await snapshotService.getLatestSnapshot(tenantId);
      const tenantBSnapshot = await snapshotService.getLatestSnapshot(otherTenantId);

      expect(tenantASnapshot?.tenantId).toBe(tenantId);
      expect(tenantBSnapshot?.tenantId).toBe(otherTenantId);
      expect(tenantASnapshot?.id).not.toBe(tenantBSnapshot?.id);
    });

    it('should fail closed with zero capacity when tenant has no engineers', async () => {
      const emptyCapacity = await capacityService.calculatePortfolioCapacity('empty-tenant-uuid');

      expect(emptyCapacity.totalEngineersCount).toBe(0);
      expect(emptyCapacity.totalAvailableWeeklyCapacityHours).toBe(0);
      expect(emptyCapacity.overallUtilizationPercentage).toBe(0);
    });

    it('should reject allocations from a different tenant', async () => {
      const res = await snapshotService.getCrossProjectAllocations('unrelated-tenant-id');
      expect(res.length).toBe(0);
    });
  });
});
