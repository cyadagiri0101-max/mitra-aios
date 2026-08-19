import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProjectDesignLoadService } from './project-design-load.service';
import {
  ProjectDesignLoad,
  ProjectDesignLoadStatus,
} from '../entities/project-design-load.entity';
import {
  ProjectDesignLoadStage,
  ProjectStageStatus,
} from '../entities/project-design-load-stage.entity';
import {
  DesignLoadStandard,
  DesignStandardStatus,
} from '../entities/design-load-standard.entity';
import { DesignLoadStandardStage } from '../entities/design-load-standard-stage.entity';
import { Employee, EmployeeStatus } from '../../people/entities/employee.entity';
import { EmployeeSkill, ProficiencyLevel } from '../../people/entities/employee-skill.entity';
import { ResourceAvailability } from '../../people/entities/resource-availability.entity';
import { AuditService } from '../../audit/services/audit.service';
import { OutboxService } from '../../platform/services/outbox.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ProjectDesignLoadService (Unit)', () => {
  let service: ProjectDesignLoadService;
  let mockLoadRepo: any;
  let mockStageRepo: any;
  let mockStandardRepo: any;
  let mockStandardStageRepo: any;
  let mockEmployeeRepo: any;
  let mockEmployeeSkillRepo: any;
  let mockAvailabilityRepo: any;
  let mockAuditService: any;
  let mockOutboxService: any;
  let mockDataSource: any;

  const tenantA = '43acde8c-9419-4f76-90ee-57c2514bc126';

  beforeEach(async () => {
    mockLoadRepo = {
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ id: 'load-1', ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      })),
    };

    mockStageRepo = {
      create: jest.fn((dto) => ({ id: 'stage-1', ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };

    mockStandardRepo = {
      findOne: jest.fn(),
    };

    mockStandardStageRepo = {};

    mockEmployeeRepo = {
      find: jest.fn(),
    };

    mockEmployeeSkillRepo = {
      find: jest.fn(),
    };

    mockAvailabilityRepo = {
      find: jest.fn(),
    };

    mockAuditService = {
      logBusinessEvent: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    mockOutboxService = {
      append: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
    };

    const mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        save: jest.fn((entity) => Promise.resolve(Array.isArray(entity) ? entity : { id: 'load-1', ...entity })),
      },
    };

    mockDataSource = {
      createQueryRunner: jest.fn(() => mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectDesignLoadService,
        { provide: getRepositoryToken(ProjectDesignLoad), useValue: mockLoadRepo },
        { provide: getRepositoryToken(ProjectDesignLoadStage), useValue: mockStageRepo },
        { provide: getRepositoryToken(DesignLoadStandard), useValue: mockStandardRepo },
        { provide: getRepositoryToken(DesignLoadStandardStage), useValue: mockStandardStageRepo },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        { provide: getRepositoryToken(EmployeeSkill), useValue: mockEmployeeSkillRepo },
        { provide: getRepositoryToken(ResourceAvailability), useValue: mockAvailabilityRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ProjectDesignLoadService>(ProjectDesignLoadService);
  });

  describe('Tenant isolation', () => {
    it('throws ForbiddenException when tenantId is omitted', async () => {
      await expect(service.findAll(null)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Create & Estimate Design Load', () => {
    it('creates design load from standard with complexity adjustment and explainability', async () => {
      const mockStandard = {
        id: 'std-type-b',
        code: 'STD-TYPE-B',
        name: 'Type B 10-day Standard',
        totalStandardDurationDays: 10,
        totalStandardHours: 80,
        status: DesignStandardStatus.ACTIVE,
        stages: [
          { stageCode: 'MOLD_DEVELOPMENT', stageName: 'Mold Development', sequence: 1, standardDurationDays: 2, standardHours: 16, status: 'ACTIVE' },
          { stageCode: 'DESIGNING', stageName: 'Designing', sequence: 2, standardDurationDays: 4, standardHours: 32, status: 'ACTIVE' },
          { stageCode: 'DETAILING', stageName: 'Detailing', sequence: 3, standardDurationDays: 3, standardHours: 24, status: 'ACTIVE' },
          { stageCode: 'FILE_SUBMISSION', stageName: 'File Submission', sequence: 4, standardDurationDays: 1, standardHours: 8, status: 'ACTIVE' },
        ],
      };

      mockStandardRepo.findOne.mockResolvedValueOnce(mockStandard);
      mockLoadRepo.findOne.mockResolvedValueOnce({
        id: 'load-1',
        loadNumber: 'DLD-2026-0001',
        projectId: 'proj-102',
        title: 'Project 102 Mold Design Load',
        complexityFactor: 1.25,
        standardDurationDays: 10,
        standardHours: 80,
        plannedDurationDays: 12.5,
        plannedHours: 100,
        explanation: 'Standard [Type B 10-day Standard] (10 days, 80 hrs) adjusted by Complexity Factor 1.25 -> Planned 12.5 days (100 hrs).',
        stages: [],
        tenantId: tenantA,
      });

      const res = await service.createLoad(
        {
          projectId: 'proj-102',
          standardId: 'std-type-b',
          title: 'Project 102 Mold Design Load',
          complexityFactor: 1.25,
          plannedStartDate: '2026-09-01',
        },
        'user-1',
        tenantA,
      );

      expect(res.loadNumber).toBe('DLD-2026-0001');
      expect(res.plannedDurationDays).toBe(12.5);
      expect(res.plannedHours).toBe(100);
      expect(res.explanation).toContain('Complexity Factor 1.25');
      expect(mockAuditService.logBusinessEvent).toHaveBeenCalledWith(
        'design_load.created',
        'project_design_load',
        expect.any(String),
        'user-1',
        expect.any(Object),
        undefined,
        'proj-102',
        tenantA,
      );
    });

    it('re-estimates design load dynamically when factor or standard changes', async () => {
      mockLoadRepo.findOne
        .mockResolvedValueOnce({
          id: 'load-1',
          loadNumber: 'DLD-2026-0001',
          projectId: 'proj-102',
          standardId: 'std-type-a',
          standardDurationDays: 5,
          standardHours: 40,
          complexityFactor: 1.0,
          stages: [
            { id: 'stg-1', sequence: 1, standardDurationDays: 5, standardHours: 40 },
          ],
        })
        .mockResolvedValueOnce({
          id: 'load-1',
          plannedDurationDays: 7.5,
          plannedHours: 60,
          complexityFactor: 1.5,
          stages: [],
        });

      mockStandardRepo.findOne.mockResolvedValueOnce({
        id: 'std-type-a',
        name: 'Type A Standard',
        totalStandardDurationDays: 5,
        totalStandardHours: 40,
        stages: [],
      });

      const res = await service.estimate(
        'load-1',
        { complexityFactor: 1.5 },
        'user-1',
        tenantA,
      );

      expect(res.plannedDurationDays).toBe(7.5);
      expect(res.plannedHours).toBe(60);
      expect(mockAuditService.logBusinessEvent).toHaveBeenCalledWith(
        'design_load.estimated',
        'project_design_load',
        'load-1',
        'user-1',
        expect.any(Object),
        undefined,
        'proj-102',
        tenantA,
      );
    });
  });

  describe('Candidate Resource Matching', () => {
    it('ranks and filters candidate engineers matching skill and minimum proficiency', async () => {
      mockLoadRepo.findOne.mockResolvedValueOnce({
        id: 'load-1',
        stages: [
          {
            id: 'stg-1',
            stageCode: 'DESIGNING',
            requiredSkillId: 'skill-mold-design',
            minimumProficiency: ProficiencyLevel.ADVANCED,
            status: ProjectStageStatus.IN_PROGRESS,
          },
        ],
      });

      mockEmployeeSkillRepo.find.mockResolvedValueOnce([
        {
          employeeId: 'emp-1',
          skillId: 'skill-mold-design',
          proficiencyLevel: ProficiencyLevel.EXPERT,
          certification: 'Siemens Certified NX Mold Master',
        },
        {
          employeeId: 'emp-2',
          skillId: 'skill-mold-design',
          proficiencyLevel: ProficiencyLevel.BEGINNER,
          certification: null,
        },
      ]);

      mockEmployeeRepo.find.mockResolvedValueOnce([
        { id: 'emp-1', employeeCode: 'EMP001', firstName: 'Alice', lastName: 'Engineer', designation: 'Senior Mold Designer', department: 'Design', status: EmployeeStatus.ACTIVE },
        { id: 'emp-2', employeeCode: 'EMP002', firstName: 'Bob', lastName: 'Junior', designation: 'Junior CAD Engineer', department: 'Design', status: EmployeeStatus.ACTIVE },
      ]);

      const result = await service.findCandidateResources('load-1', undefined, tenantA);

      expect(result.requiredSkillId).toBe('skill-mold-design');
      expect(result.minimumProficiency).toBe(ProficiencyLevel.ADVANCED);
      expect(result.candidates).toHaveLength(2);

      // Alice is EXPERT >= ADVANCED (qualified)
      expect(result.candidates[0].employeeCode).toBe('EMP001');
      expect(result.candidates[0].isQualified).toBe(true);

      // Bob is BEGINNER < ADVANCED (not qualified)
      expect(result.candidates[1].employeeCode).toBe('EMP002');
      expect(result.candidates[1].isQualified).toBe(false);
    });
  });
});
