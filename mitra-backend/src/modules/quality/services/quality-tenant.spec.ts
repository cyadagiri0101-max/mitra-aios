import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InspectionPlanService } from './inspection-plan.service';
import { SupplierInspectionService } from './supplier-inspection.service';
import { InspectionPlan } from '../entities/inspection-plan.entity';
import { SupplierInspection } from '../entities/supplier-inspection.entity';
import { OutboxService } from '@modules/platform/services/outbox.service';

const makeRepo = () => ({
  findOne: jest.fn().mockResolvedValue(null),
  find: jest.fn().mockResolvedValue([]),
  findAndCount: jest.fn().mockResolvedValue([[], 0]),
  create: jest.fn((d: any) => ({ ...d, id: 'q-1' })),
  save: jest.fn((e: any) => Promise.resolve({ id: 'saved-q-1', ...e })),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  createQueryBuilder: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  }),
});

describe('Quality Services — Tenant Isolation', () => {
  let planService: InspectionPlanService;
  let supplierService: SupplierInspectionService;
  let planRepo: ReturnType<typeof makeRepo>;
  let supplierRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    planRepo = makeRepo();
    supplierRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InspectionPlanService,
        SupplierInspectionService,
        { provide: getRepositoryToken(InspectionPlan), useValue: planRepo },
        { provide: getRepositoryToken(SupplierInspection), useValue: supplierRepo },
        { provide: OutboxService, useValue: { append: jest.fn().mockResolvedValue({}) } },
      ],
    }).compile();

    planService = module.get<InspectionPlanService>(InspectionPlanService);
    supplierService = module.get<SupplierInspectionService>(SupplierInspectionService);
  });

  describe('InspectionPlanService', () => {
    it('rejects tenantless requests with 403', async () => {
      await expect(planService.findAll({}, '')).rejects.toThrow(ForbiddenException);
      await expect(planService.findOne('p-1', null)).rejects.toThrow(ForbiddenException);
      await expect(planService.create({}, 'u-1', undefined)).rejects.toThrow(ForbiddenException);
    });

    it('scopes findOne to caller tenant', async () => {
      planRepo.findOne.mockResolvedValue(null);
      await expect(planService.findOne('p-1', 'tenant-a')).rejects.toThrow(NotFoundException);
      expect(planRepo.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: 'p-1', tenantId: 'tenant-a' }),
      });
    });
  });

  describe('SupplierInspectionService', () => {
    it('rejects tenantless requests with 403', async () => {
      await expect(supplierService.findAll({}, null)).rejects.toThrow(ForbiddenException);
      await expect(supplierService.findOne('s-1', '')).rejects.toThrow(ForbiddenException);
      await expect(supplierService.create({}, 'u-1', undefined)).rejects.toThrow(ForbiddenException);
    });

    it('scopes findOne to caller tenant', async () => {
      supplierRepo.findOne.mockResolvedValue(null);
      await expect(supplierService.findOne('s-1', 'tenant-b')).rejects.toThrow(NotFoundException);
      expect(supplierRepo.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: 's-1', tenantId: 'tenant-b' }),
      });
    });
  });
});
