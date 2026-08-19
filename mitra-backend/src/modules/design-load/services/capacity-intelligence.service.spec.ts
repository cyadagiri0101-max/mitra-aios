import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CapacityIntelligenceService } from './capacity-intelligence.service';
import { ProjectDesignLoad } from '../entities/project-design-load.entity';
import { ProjectDesignLoadStage } from '../entities/project-design-load-stage.entity';
import { DesignSystem, DesignSystemStatus } from '../entities/design-system.entity';
import { DesignShift } from '../entities/design-shift.entity';
import { Employee, EmployeeStatus } from '../../people/entities/employee.entity';
import { EmployeeSkill, ProficiencyLevel } from '../../people/entities/employee-skill.entity';
import { Skill } from '../../people/entities/skill.entity';
import { ResourceAvailability } from '../../people/entities/resource-availability.entity';
import { Project } from '../../project/entities/project.entity';
import { AuditService } from '../../audit/services/audit.service';
import { CapacityHorizon } from '../dto/capacity-planning.dto';

describe('CapacityIntelligenceService', () => {
  let service: CapacityIntelligenceService;
  let loadRepo: any;
  let stageRepo: any;
  let systemRepo: any;
  let shiftRepo: any;
  let employeeRepo: any;
  let employeeSkillRepo: any;
  let skillRepo: any;
  let availabilityRepo: any;
  let projectRepo: any;
  let auditService: any;

  const tenantId = '11111111-1111-1111-1111-111111111111';

  beforeEach(async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'load-1',
          projectId: 'p-1',
          plannedHours: 80,
          stages: [
            { id: 'stg-1', stageCode: 'DESIGNING', plannedHours: 40, assignedEmployeeId: 'emp-1' },
            { id: 'stg-2', stageCode: 'DETAILING', plannedHours: 40, assignedEmployeeId: 'emp-2' },
          ],
        },
        {
          id: 'load-2',
          projectId: 'p-2',
          plannedHours: 120,
          stages: [
            { id: 'stg-3', stageCode: 'DESIGNING', plannedHours: 60 },
            { id: 'stg-4', stageCode: 'DETAILING', plannedHours: 60 },
          ],
        },
      ]),
    };

    loadRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      find: jest.fn().mockResolvedValue([
        {
          id: 'load-1',
          projectId: 'p-1',
          plannedHours: 80,
          stages: [{ stageCode: 'DESIGNING', plannedHours: 40 }],
        },
      ]),
    };

    stageRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'stg-1', assignedEmployeeId: 'emp-1', plannedHours: 120, actualHours: 90 },
        { id: 'stg-2', assignedEmployeeId: 'emp-2', plannedHours: 180, actualHours: 150 }, // Overloaded
      ]),
    };

    systemRepo = {
      find: jest.fn().mockResolvedValue(
        Array.from({ length: 10 }).map((_, i) => ({
          id: `ws-${i + 1}`,
          systemCode: `CAD-WS-${String(i + 1).padStart(2, '0')}`,
          status: DesignSystemStatus.ACTIVE,
        })),
      ),
    };

    shiftRepo = {
      find: jest.fn().mockResolvedValue([
        { shiftCode: 'SHIFT_1', isActive: true },
        { shiftCode: 'SHIFT_2', isActive: true },
        { shiftCode: 'SHIFT_3', isActive: true },
      ]),
    };

    employeeRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'emp-1', employeeCode: 'EMP-001', firstName: 'Alice', lastName: 'Engineer', department: 'Design' },
        { id: 'emp-2', employeeCode: 'EMP-002', firstName: 'Bob', lastName: 'Designer', department: 'Design' },
      ]),
    };

    skillRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'sk-1', name: 'Mold CAD' },
        { id: 'sk-2', name: 'Tool Detailing' },
      ]),
    };

    employeeSkillRepo = {
      find: jest.fn().mockResolvedValue([
        { employeeId: 'emp-1', skillId: 'sk-1', proficiencyLevel: ProficiencyLevel.ADVANCED },
        { employeeId: 'emp-2', skillId: 'sk-2', proficiencyLevel: ProficiencyLevel.EXPERT },
      ]),
    };

    availabilityRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    projectRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    auditService = {
      logBusinessEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapacityIntelligenceService,
        { provide: getRepositoryToken(ProjectDesignLoad), useValue: loadRepo },
        { provide: getRepositoryToken(ProjectDesignLoadStage), useValue: stageRepo },
        { provide: getRepositoryToken(DesignSystem), useValue: systemRepo },
        { provide: getRepositoryToken(DesignShift), useValue: shiftRepo },
        { provide: getRepositoryToken(Employee), useValue: employeeRepo },
        { provide: getRepositoryToken(EmployeeSkill), useValue: employeeSkillRepo },
        { provide: getRepositoryToken(Skill), useValue: skillRepo },
        { provide: getRepositoryToken(ResourceAvailability), useValue: availabilityRepo },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<CapacityIntelligenceService>(CapacityIntelligenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCapacitySummary', () => {
    it('should aggregate multi-project demand against workstation and engineer capacity', async () => {
      const summary = await service.getCapacitySummary({ horizon: CapacityHorizon.MONTHLY }, tenantId);

      expect(summary).toBeDefined();
      expect(summary.totalDesignDemandHours).toBe(200); // 80 + 120
      expect(summary.activeWorkstationsCount).toBe(10);
      expect(summary.activeDesignEngineersCount).toBe(2);
    });
  });

  describe('getEngineerUtilization', () => {
    it('should compute live utilization % and flag overloaded engineers', async () => {
      const util = await service.getEngineerUtilization(tenantId);

      expect(util).toHaveLength(2);
      const emp1 = util.find((u) => u.employeeId === 'emp-1');
      const emp2 = util.find((u) => u.employeeId === 'emp-2');

      expect(emp1?.allocatedUtilizationPct).toBe(75.0); // 120 / 160 = 75%
      expect(emp1?.isOverloaded).toBe(false);

      expect(emp2?.allocatedUtilizationPct).toBe(112.5); // 180 / 160 = 112.5%
      expect(emp2?.isOverloaded).toBe(true);
      expect(emp2?.status).toBe('OVERLOADED');
    });
  });

  describe('runWhatIfSimulation', () => {
    it('should simulate adding engineers and outsourcing workload without modifying production state', async () => {
      const sim = await service.runWhatIfSimulation(
        { addEngineers: 1, engineerWeeklyHours: 40, outsourceHours: 40 },
        tenantId,
      );

      expect(sim).toBeDefined();
      expect(sim.simulatedSummary.totalDesignDemandHours).toBeLessThanOrEqual(sim.baselineSummary.totalDesignDemandHours);
      expect(sim.explanation).toContain('Simulation Scenario');
    });
  });

  describe('getCapacityRecommendations and getCapacityRisks', () => {
    it('should generate deterministic recommendations and risks for overloaded engineer', async () => {
      const [recs, risks] = await Promise.all([
        service.getCapacityRecommendations(tenantId),
        service.getCapacityRisks(tenantId),
      ]);

      expect(recs.length).toBeGreaterThan(0);
      expect(risks.length).toBeGreaterThan(0);
      expect(risks[0].riskType).toBe('OVERLOAD');
    });
  });
});
