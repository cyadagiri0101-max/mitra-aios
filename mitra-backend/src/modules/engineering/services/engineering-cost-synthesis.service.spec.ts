import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EngineeringCostSynthesisService } from './engineering-cost-synthesis.service';
import {
  EngineeringCostConfiguration,
  CostRateType,
  CostConfigurationStatus,
} from '../entities/engineering-cost-configuration.entity';
import { CostStatus } from '../entities/engineering-reasoning-result.entity';
import { AuditService } from '../../audit/services/audit.service';

describe('EngineeringCostSynthesisService Unit Tests', () => {
  let service: EngineeringCostSynthesisService;

  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '99999999-9999-9999-9999-999999999999';

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  const mockCostConfigRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    create: jest.fn((dto) => ({ id: 'cost-cfg-01', ...dto })),
    save: jest.fn((entity) => Promise.resolve({ id: entity.id || 'cost-cfg-01', ...entity })),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringCostSynthesisService,
        {
          provide: getRepositoryToken(EngineeringCostConfiguration),
          useValue: mockCostConfigRepo,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<EngineeringCostSynthesisService>(EngineeringCostSynthesisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rate Lookups & Missing Rate Governance', () => {
    it('returns configured rate when active match exists', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce({
        id: 'cfg-rate-01',
        rateValue: 1250.0,
        currency: 'INR',
        uom: 'HOUR',
        source: 'CNC Rate Master 2026',
        sourceReference: 'REF-CNC-01',
        effectiveFrom: new Date('2026-01-01'),
      });

      const result = await service.lookupRate(tenantA, CostRateType.MACHINE_HOUR);
      expect(result.found).toBe(true);
      expect(result.rateValue).toBe(1250.0);
      expect(result.currency).toBe('INR');
      expect(result.source).toBe('CNC Rate Master 2026');
    });

    it('returns COST_NOT_CONFIGURED (rateValue null, found false) when no rate exists', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      const result = await service.lookupRate(tenantA, CostRateType.MATERIAL_UNIT);
      expect(result.found).toBe(false);
      expect(result.rateValue).toBeNull();
      expect(result.source).toBeNull();
    });

    it('throws ForbiddenException if tenantId is missing', async () => {
      await expect(service.lookupRate('', CostRateType.MACHINE_HOUR)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Cost Synthesis & 3-Point Range Modeling', () => {
    it('synthesizes full 6-category cost when rates are available', async () => {
      // Return configured rates for all 6 lookups: MAT, MACH, TOOL, QUAL, SETUP, REWORK
      mockQueryBuilder.getOne
        .mockResolvedValueOnce({ rateValue: 280.0, currency: 'INR', uom: 'KG', source: 'ABS Resin Master', id: '1' })
        .mockResolvedValueOnce({ rateValue: 1500.0, currency: 'INR', uom: 'HOUR', source: 'CNC 5-Axis Rate', id: '2' })
        .mockResolvedValueOnce({ rateValue: 1800.0, currency: 'INR', uom: 'HOUR', source: 'EDM Setup Rate', id: '3' })
        .mockResolvedValueOnce({ rateValue: 800.0, currency: 'INR', uom: 'HOUR', source: 'CMM Rate', id: '4' })
        .mockResolvedValueOnce({ rateValue: 1200.0, currency: 'INR', uom: 'HOUR', source: 'Injection Setup', id: '5' })
        .mockResolvedValueOnce({ rateValue: 600.0, currency: 'INR', uom: 'HOUR', source: 'Bench Fitting Rate', id: '6' });

      const summary = await service.synthesizeCostImpact('DFM-WALL-001', 'ABS', 'INJECTION_MOLDING', tenantA);

      expect(summary.costRangeModel).toBe('THREE_POINT');
      expect(summary.total.expected).toBeGreaterThan(0);
      expect(summary.total.low).toBe(Number((summary.total.expected! * 0.85).toFixed(2)));
      expect(summary.total.high).toBe(Number((summary.total.expected! * 1.25).toFixed(2)));
      expect(summary.material[0].status).toBe(CostStatus.KNOWN);
      expect(summary.machining[0].status).toBe(CostStatus.ESTIMATED);
      expect(summary.tooling[0].status).toBe(CostStatus.ESTIMATED);
      expect(summary.quality[0].status).toBe(CostStatus.ESTIMATED);
      expect(summary.rework[0].status).toBe(CostStatus.ESTIMATED);
      expect(summary.missingComponents.length).toBe(0);
    });

    it('identifies missing rate categories as COST_NOT_CONFIGURED with null cost', async () => {
      // Mock all lookups returning null
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const summary = await service.synthesizeCostImpact('DFM-WALL-001', 'ABS', 'INJECTION_MOLDING', tenantA);

      expect(summary.missingComponents).toContain('MATERIAL');
      expect(summary.missingComponents).toContain('MACHINING');
      expect(summary.missingComponents).toContain('TOOLING');
      expect(summary.missingComponents).toContain('QUALITY');
      expect(summary.missingComponents).toContain('SCHEDULE');
      expect(summary.missingComponents).toContain('REWORK');
      expect(summary.total.expected).toBeNull();
      expect(summary.total.low).toBeNull();
      expect(summary.total.high).toBeNull();
    });
  });

  describe('Cost Configuration CRUD Operations', () => {
    it('creates a cost configuration and logs audit event', async () => {
      const result = await service.createCostConfiguration(
        {
          rateType: CostRateType.MACHINE_HOUR,
          rateName: 'VMC 3-Axis Heavy Milling',
          rateValue: 1650.0,
          currency: 'INR',
          uom: 'HOUR',
        },
        tenantA,
        { id: 'user-01' },
      );

      expect(result.rateName).toBe('VMC 3-Axis Heavy Milling');
      expect(result.rateValue).toBe(1650.0);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'COST_CONFIGURATION_CREATED',
          tenantId: tenantA,
        }),
      );
    });

    it('queries cost configurations with tenant isolation', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([
        [{ id: 'cfg-1', rateName: 'Rate 1', tenantId: tenantA }],
        1,
      ]);

      const res = await service.getCostConfigurations({}, tenantA);
      expect(res.total).toBe(1);
      expect(res.data[0].id).toBe('cfg-1');
    });

    it('throws NotFoundException when configuration is missing on update', async () => {
      mockCostConfigRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.updateCostConfiguration('missing-id', { rateValue: 2000 }, tenantA),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
