import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DesignLoadStandardService } from './design-load-standard.service';
import {
  DesignLoadStandard,
  DesignStandardStatus,
  ComplexityLevel,
  ProvenanceSource,
} from '../entities/design-load-standard.entity';
import { DesignLoadStandardStage } from '../entities/design-load-standard-stage.entity';
import { AuditService } from '../../audit/services/audit.service';
import { OutboxService } from '../../platform/services/outbox.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('DesignLoadStandardService (Unit)', () => {
  let service: DesignLoadStandardService;
  let mockStandardRepo: any;
  let mockStageRepo: any;
  let mockAuditService: any;
  let mockOutboxService: any;
  let mockDataSource: any;

  const tenantA = '43acde8c-9419-4f76-90ee-57c2514bc126';
  const tenantB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  beforeEach(async () => {
    mockStandardRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ id: 'std-1', ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 'std-1',
              code: 'STD-TYPE-A',
              name: 'Type A Standard',
              totalStandardDurationDays: 5,
              totalStandardHours: 40,
              tenantId: tenantA,
              stages: [],
            },
          ],
          1,
        ]),
      })),
    };

    mockStageRepo = {
      create: jest.fn((dto) => ({ id: 'stg-1', ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      find: jest.fn().mockResolvedValue([]),
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
        save: jest.fn((entity) => Promise.resolve(Array.isArray(entity) ? entity : { id: 'std-1', ...entity })),
      },
    };

    mockDataSource = {
      createQueryRunner: jest.fn(() => mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DesignLoadStandardService,
        { provide: getRepositoryToken(DesignLoadStandard), useValue: mockStandardRepo },
        { provide: getRepositoryToken(DesignLoadStandardStage), useValue: mockStageRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<DesignLoadStandardService>(DesignLoadStandardService);
  });

  describe('Tenant isolation', () => {
    it('throws ForbiddenException when tenantId is omitted', async () => {
      await expect(service.findAll(null)).rejects.toThrow(ForbiddenException);
    });

    it('scopes list queries to requested tenant', async () => {
      const result = await service.findAll(tenantA);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('Create Design Standard', () => {
    it('creates standard and stages with calculated duration and hours', async () => {
      mockStandardRepo.findOne.mockResolvedValueOnce(null); // No existing code duplicate
      mockStandardRepo.findOne.mockResolvedValueOnce({
        id: 'std-1',
        code: 'STD-TYPE-B',
        name: 'Type B Standard',
        totalStandardDurationDays: 10,
        totalStandardHours: 80,
        tenantId: tenantA,
        stages: [
          { stageCode: 'MOLD_DEVELOPMENT', sequence: 1, standardDurationDays: 2, standardHours: 16 },
          { stageCode: 'DESIGNING', sequence: 2, standardDurationDays: 4, standardHours: 32 },
          { stageCode: 'DETAILING', sequence: 3, standardDurationDays: 3, standardHours: 24 },
          { stageCode: 'FILE_SUBMISSION', sequence: 4, standardDurationDays: 1, standardHours: 8 },
        ],
      });

      const res = await service.createStandard(
        {
          code: 'STD-TYPE-B',
          name: 'Type B Standard',
          complexityLevel: ComplexityLevel.STANDARD,
          provenanceSource: ProvenanceSource.MANUAL,
          stages: [
            { stageCode: 'MOLD_DEVELOPMENT', stageName: 'Mold Development', sequence: 1, standardDurationDays: 2, standardHours: 16 },
            { stageCode: 'DESIGNING', stageName: 'Designing', sequence: 2, standardDurationDays: 4, standardHours: 32 },
            { stageCode: 'DETAILING', stageName: 'Detailing', sequence: 3, standardDurationDays: 3, standardHours: 24 },
            { stageCode: 'FILE_SUBMISSION', stageName: 'File Submission', sequence: 4, standardDurationDays: 1, standardHours: 8 },
          ],
        },
        'user-1',
        tenantA,
      );

      expect(res.code).toBe('STD-TYPE-B');
      expect(res.totalStandardDurationDays).toBe(10);
      expect(res.stages).toHaveLength(4);
      expect(mockAuditService.logBusinessEvent).toHaveBeenCalledWith(
        'design_standard.created',
        'design_load_standard',
        expect.any(String),
        'user-1',
        expect.any(Object),
        undefined,
        undefined,
        tenantA,
      );
    });

    it('rejects duplicate standard code in same tenant', async () => {
      mockStandardRepo.findOne.mockResolvedValueOnce({ id: 'existing', code: 'STD-TYPE-B', tenantId: tenantA });

      await expect(
        service.createStandard({ code: 'STD-TYPE-B', name: 'Duplicate' }, 'user-1', tenantA),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
