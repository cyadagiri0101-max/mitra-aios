import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MaterialManagementService } from './material-management.service';
import { MaterialReservation, ReservationStatus } from '../entities/material-reservation.entity';
import { MaterialIssue } from '../entities/materialissue.entity';
import { WorkOrder } from '../entities/workorder.entity';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';

const user: any = { id: 'u-1', email: 'ops@mitra.io', role: 'PLANNING', tenantId: 't-1', permissions: [] };

describe('MaterialManagementService', () => {
  let service: MaterialManagementService;
  let outbox: any;
  let resRepo: any;
  let issueRepo: any;
  const outboxRows: any[] = [];

  const reservation = {
    id: 'res-1', reservationNumber: 'RES-1', workOrderId: 'wo-1', bomItemId: 'bi-1',
    partNumber: 'RM-001', partName: 'EN8 Bar', uom: 'KG',
    plannedQty: 20, reservedQty: 20, issuedQty: 0,
    status: ReservationStatus.RESERVED, batchId: null, storeLocation: 'A-1', remarks: null,
    tenantId: 't-1',
  };

  beforeEach(async () => {
    outboxRows.length = 0;
    resRepo = {
      findOne: jest.fn().mockResolvedValue({ ...reservation }),
      find: jest.fn().mockResolvedValue([{ ...reservation }]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ ...reservation, shortQty: 0 }]),
      })),
    };
    issueRepo = {
      create: jest.fn((d: any) => ({ ...d, id: 'mi-1' })),
      save: jest.fn(async (d: any) => ({ ...d, id: 'mi-1' })),
      find: jest.fn().mockResolvedValue([]),
    };
    const woRepo = { findOne: jest.fn().mockResolvedValue({ id: 'wo-1' }) };
    outbox = { append: jest.fn(async (eventType: string, aggregateType: string, aggregateId: string, payload: any, opts: any) => {
      outboxRows.push({ eventType, aggregateType, aggregateId, payload, opts });
      return { id: 'o-1' };
    }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialManagementService,
        { provide: getRepositoryToken(MaterialReservation), useValue: resRepo },
        { provide: getRepositoryToken(MaterialIssue), useValue: issueRepo },
        { provide: getRepositoryToken(WorkOrder), useValue: woRepo },
        { provide: OutboxService, useValue: outbox },
      ],
    }).compile();

    service = module.get(MaterialManagementService);
  });

  describe('issue', () => {
    it('issues the full reserved quantity', async () => {
      const result = await service.issue('res-1', user, {});
      expect(issueRepo.save).toHaveBeenCalledWith(expect.objectContaining({ quantity: 20, unit: 'KG', workOrderId: 'wo-1' }));
      expect(resRepo.update).toHaveBeenCalledWith({ id: 'res-1', tenantId: 't-1' }, expect.objectContaining({ issuedQty: 20, status: 'ISSUED' }));
      expect(outboxRows.some((r) => r.eventType === EngineeringDomainEventType.MATERIAL_RESERVED)).toBe(true);
      expect(result).toBeDefined();
    });

    it('emits MATERIAL_SHORTAGE for a partial issue', async () => {
      const result = await service.issue('res-1', user, { qty: 5 });
      expect(resRepo.update).toHaveBeenCalledWith({ id: 'res-1', tenantId: 't-1' }, expect.objectContaining({ issuedQty: 5, status: 'PARTIALLY_ISSUED' }));
      expect(outboxRows.some((r) => r.eventType === EngineeringDomainEventType.MATERIAL_SHORTAGE)).toBe(true);
      expect(result).toBeDefined();
    });

    it('rejects over-issue beyond the reserved quantity', async () => {
      await expect(service.issue('res-1', user, { qty: 21 })).rejects.toThrow(BadRequestException);
    });
  });

  describe('releaseUnused', () => {
    it('releases unused quantity and emits MATERIAL_VARIANCE', async () => {
      resRepo.findOne.mockResolvedValue({ ...reservation, issuedQty: 10, reservedQty: 20 });
      await service.releaseUnused('res-1', user, {});
      expect(resRepo.update).toHaveBeenCalledWith({ id: 'res-1', tenantId: 't-1' }, expect.objectContaining({ reservedQty: 10, status: 'ISSUED' }));
      expect(outboxRows.some((r) => r.eventType === EngineeringDomainEventType.MATERIAL_VARIANCE && r.payload.releasedQty === 10)).toBe(true);
    });
  });

  describe('consumptionSummary', () => {
    it('rolls up planned/reserved/issued quantities', async () => {
      resRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ ...reservation, issuedQty: 12 }]),
      });
      issueRepo.find.mockResolvedValue([{ issueNumber: 'MI-1', materialCode: 'RM-001', quantity: 12, unit: 'KG', issueDate: new Date(), storeLocation: 'A-1' }]);
      const result = await service.consumptionSummary('wo-1', 't-1');
      expect(result.planned).toBe(20);
      expect(result.issued).toBe(12);
      expect(result.variance).toBe(8);
    });
  });

  describe('shortages', () => {
    it('flags partially issued reservations with short quantity', async () => {
      resRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ ...reservation, issuedQty: 5 }]),
      });
      const result = await service.shortages({}, 't-1');
      expect(result[0].shortQty).toBe(15);
    });
  });

  describe('tenant isolation', () => {
    it('rejects issue without tenant context', async () => {
      const tenantless = { id: 'u-1', email: 'ops@mitra.io', role: 'PLANNING', tenantId: null, permissions: [] };
      await expect(service.issue('res-1', tenantless, {})).rejects.toThrow(ForbiddenException);
    });

    it('rejects releaseUnused without tenant context', async () => {
      const tenantless = { id: 'u-1', email: 'ops@mitra.io', role: 'PLANNING', tenantId: null, permissions: [] };
      await expect(service.releaseUnused('res-1', tenantless, {})).rejects.toThrow(ForbiddenException);
    });
  });
});
