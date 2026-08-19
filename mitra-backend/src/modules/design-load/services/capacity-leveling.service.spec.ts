import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CapacityLevelingService } from './capacity-leveling.service';
import { CapacityIntelligenceService } from './capacity-intelligence.service';
import { ProjectDesignLoad } from '../entities/project-design-load.entity';
import { ProjectDesignLoadStage } from '../entities/project-design-load-stage.entity';
import { DesignSystem } from '../entities/design-system.entity';
import { Employee, EmployeeStatus } from '../../people/entities/employee.entity';
import { EmployeeSkill } from '../../people/entities/employee-skill.entity';
import { Skill } from '../../people/entities/skill.entity';
import { Project } from '../../project/entities/project.entity';
import { AuditService } from '../../audit/services/audit.service';
import { LevelingActionType } from '../dto/capacity-leveling.dto';

describe('CapacityLevelingService (W4 / G3 Scenario)', () => {
  let service: CapacityLevelingService;
  let stageRepo: any;
  let employeeRepo: any;
  let capacityIntelligenceService: any;
  let auditService: any;

  const mockTenantId = 'tenant-uuid-1';
  const mockUserId = 'user-uuid-1';

  beforeEach(async () => {
    stageRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
    };
    employeeRepo = {
      findOne: jest.fn(),
    };
    capacityIntelligenceService = {
      getEngineerUtilization: jest.fn().mockResolvedValue([
        {
          employeeId: 'emp-overloaded',
          fullName: 'Senior Mold Designer A',
          allocatedHours: 60,
          availableHours: 40,
          allocatedUtilizationPct: 150,
          isOverloaded: true,
        },
        {
          employeeId: 'emp-underutilized',
          fullName: 'Design Engineer B',
          allocatedHours: 20,
          availableHours: 40,
          allocatedUtilizationPct: 50,
          isOverloaded: false,
        },
      ]),
      getCapacitySummary: jest.fn().mockResolvedValue({
        activeProjectsCount: 5,
        overloadedWorkstationsCount: 2,
        capacityGapHours: 45,
      }),
    };
    auditService = {
      logBusinessEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapacityLevelingService,
        { provide: getRepositoryToken(ProjectDesignLoad), useValue: {} },
        { provide: getRepositoryToken(ProjectDesignLoadStage), useValue: stageRepo },
        { provide: getRepositoryToken(DesignSystem), useValue: {} },
        { provide: getRepositoryToken(Employee), useValue: employeeRepo },
        { provide: getRepositoryToken(EmployeeSkill), useValue: {} },
        { provide: getRepositoryToken(Skill), useValue: {} },
        { provide: getRepositoryToken(Project), useValue: {} },
        { provide: CapacityIntelligenceService, useValue: capacityIntelligenceService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<CapacityLevelingService>(CapacityLevelingService);
  });

  it('should analyze capacity bottlenecks and generate explainable leveling recommendations', async () => {
    stageRepo.find.mockResolvedValue([
      {
        id: 'stage-101',
        stageName: '3D Cavity Detailing',
        assignedEmployeeId: 'emp-overloaded',
        plannedHours: 20,
        standardHours: 20,
        designLoad: { projectId: 'proj-1' },
      },
    ]);

    const report = await service.analyzeAndRecommend(mockTenantId, {});

    expect(report.totalActiveProjects).toBe(5);
    expect(report.overloadedEngineersCount).toBe(1);
    expect(report.totalUnresolvedGapHours).toBe(45);
    expect(report.recommendations.length).toBeGreaterThan(0);

    const reassignRec = report.recommendations.find(
      (r) => r.actionType === LevelingActionType.REASSIGN_ENGINEER,
    );
    expect(reassignRec).toBeDefined();
    expect(reassignRec?.sourceEngineerId).toBe('emp-overloaded');
    expect(reassignRec?.targetEngineerId).toBe('emp-underutilized');
    expect(reassignRec?.requiresApproval).toBe(true);
  });

  it('should apply an approved leveling action and write an audit event', async () => {
    const mockStage = {
      id: 'stage-101',
      stageName: '3D Cavity Detailing',
      assignedEmployeeId: 'emp-overloaded',
      tenantId: mockTenantId,
      designLoad: { projectId: 'proj-1' },
    };
    stageRepo.findOne.mockResolvedValue(mockStage);
    employeeRepo.findOne.mockResolvedValue({
      id: 'emp-underutilized',
      firstName: 'Design',
      lastName: 'Engineer B',
      status: EmployeeStatus.ACTIVE,
    });

    const result = await service.applyLevelingAction(
      mockTenantId,
      {
        actionType: LevelingActionType.REASSIGN_ENGINEER,
        stageId: 'stage-101',
        targetEngineerId: 'emp-underutilized',
        notes: 'Approved workload rebalancing for critical injection mold timeline',
      },
      mockUserId,
    );

    expect(result.applied).toBe(true);
    expect(mockStage.assignedEmployeeId).toBe('emp-underutilized');
    expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
      'capacity.leveling.applied',
      'ProjectDesignLoadStage',
      'stage-101',
      mockUserId,
      expect.objectContaining({
        actionType: LevelingActionType.REASSIGN_ENGINEER,
        newEngineerId: 'emp-underutilized',
        newEngineerName: 'Design Engineer B',
      }),
      undefined,
      'proj-1',
    );
  });
});
