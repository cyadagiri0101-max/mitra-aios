import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DesignSystemService } from './design-system.service';
import { DesignSystem, DesignSystemStatus, DesignSystemType } from '../entities/design-system.entity';
import { DesignShift } from '../entities/design-shift.entity';
import { AuditService } from '../../audit/services/audit.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('DesignSystemService (Unit)', () => {
  let service: DesignSystemService;
  let mockSystemRepo: any;
  let mockShiftRepo: any;
  let mockAuditService: any;

  const tenantA = '43acde8c-9419-4f76-90ee-57c2514bc126';

  beforeEach(async () => {
    mockSystemRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn().mockResolvedValue(10),
      create: jest.fn((dto) => ({ id: 'sys-1', ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            { id: 'sys-1', systemCode: 'CAD-WS-01', dailyCapacityHours: 24, status: DesignSystemStatus.ACTIVE },
            { id: 'sys-2', systemCode: 'CAD-WS-02', dailyCapacityHours: 24, status: DesignSystemStatus.ACTIVE },
          ],
          2,
        ]),
      })),
    };

    mockShiftRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'shift-1', shiftCode: 'SHIFT_1', name: 'Morning Shift', durationHours: 8 },
        { id: 'shift-2', shiftCode: 'SHIFT_2', name: 'Evening Shift', durationHours: 8 },
        { id: 'shift-3', shiftCode: 'SHIFT_3', name: 'Night Shift', durationHours: 8 },
      ]),
      count: jest.fn().mockResolvedValue(3),
      create: jest.fn((dto) => ({ id: 'shift-1', ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    mockAuditService = {
      logBusinessEvent: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DesignSystemService,
        { provide: getRepositoryToken(DesignSystem), useValue: mockSystemRepo },
        { provide: getRepositoryToken(DesignShift), useValue: mockShiftRepo },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<DesignSystemService>(DesignSystemService);
  });

  describe('Tenant isolation', () => {
    it('throws ForbiddenException when tenantId is omitted', async () => {
      await expect(service.findAllSystems(null)).rejects.toThrow(ForbiddenException);
    });

    it('calculates total daily capacity hours across active workstations', async () => {
      const result = await service.findAllSystems(tenantA);
      expect(result.data).toHaveLength(2);
      expect(result.totalDailyCapacityHours).toBe(48);
    });
  });

  describe('Shifts', () => {
    it('returns all 3 configured shifts', async () => {
      const shifts = await service.findAllShifts(tenantA);
      expect(shifts).toHaveLength(3);
      expect(shifts[0].shiftCode).toBe('SHIFT_1');
    });
  });
});
