import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { NcrService } from './ncr.service';
import { NcrRecord, NcrStatus } from '../entities/ncr-record.entity';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';

const user: any = { id: 'u-1', email: 'qc@mitra.io', role: 'QUALITY', tenantId: 't-1', permissions: [] };

describe('NcrService', () => {
  let service: NcrService;
  let outbox: any;
  let repo: any;
  const outboxRows: any[] = [];

  const ncr = {
    id: 'ncr-1', ncrNumber: 'NCR-1', workOrderId: 'wo-1', projectId: 'p-1', operationId: 'op-1',
    ncrType: 'INTERNAL', severity: 'MAJOR', description: 'OD out of tolerance',
    disposition: null, status: NcrStatus.OPEN, closedAt: null, tenantId: 't-1',
  };

  beforeEach(async () => {
    outboxRows.length = 0;
    repo = {
      findOne: jest.fn().mockResolvedValue({ ...ncr }),
      create: jest.fn((d: any) => ({ ...d })),
      save: jest.fn(async (d: any) => ({ ...d, id: d.id ?? 'ncr-9' })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ ...ncr }], 1]),
      })),
    };
    outbox = { append: jest.fn(async (eventType: string, aggregateType: string, aggregateId: string, payload: any, opts: any) => {
      outboxRows.push({ eventType, aggregateType, aggregateId, payload, opts });
      return { id: 'o-1' };
    }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NcrService,
        { provide: getRepositoryToken(NcrRecord), useValue: repo },
        { provide: OutboxService, useValue: outbox },
      ],
    }).compile();

    service = module.get(NcrService);
  });

  describe('create', () => {
    it('generates an NCR number, defaults status to OPEN and emits NCR_RAISED', async () => {
      const result = await service.create({ workOrderId: 'wo-1', severity: 'MAJOR', description: 'OD out of tolerance' }, user);
      expect(result.ncrNumber).toMatch(/^NCR-/);
      expect(result.status).toBe(NcrStatus.OPEN);
      expect(outboxRows.some((r) => r.eventType === EngineeringDomainEventType.NCR_RAISED && r.payload.ncrNumber === result.ncrNumber)).toBe(true);
    });
  });

  describe('transition', () => {
    it('follows OPEN → INVESTIGATION → ACTION → VERIFIED → CLOSED', async () => {
      for (const [from, to] of [[NcrStatus.OPEN, NcrStatus.INVESTIGATION], [NcrStatus.INVESTIGATION, NcrStatus.ACTION], [NcrStatus.ACTION, NcrStatus.VERIFIED]]) {
        repo.findOne.mockResolvedValueOnce({ ...ncr, status: from }).mockResolvedValueOnce({ ...ncr, status: to });
        const result = await service.transition('ncr-1', to as NcrStatus, user, {});
        expect(result.status).toBe(to);
      }
    });

    it('rejects illegal transitions (OPEN → CLOSED is allowed, VERIFIED → ACTION is not)', async () => {
      repo.findOne.mockResolvedValue({ ...ncr, status: NcrStatus.VERIFIED });
      await expect(service.transition('ncr-1', NcrStatus.ACTION, user, {})).rejects.toThrow(BadRequestException);
    });

    it('emits NCR_CLOSED and stamps closedAt on close', async () => {
      repo.findOne.mockResolvedValue({ ...ncr, status: NcrStatus.ACTION });
      await service.transition('ncr-1', NcrStatus.CLOSED, user, { disposition: 'REWORK' });
      expect(repo.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'ncr-1', tenantId: 't-1' }), expect.objectContaining({ status: 'CLOSED', disposition: 'REWORK', closedAt: expect.any(Date) }));
      expect(outboxRows.some((r) => r.eventType === EngineeringDomainEventType.NCR_CLOSED)).toBe(true);
    });
  });

  describe('tenant isolation', () => {
    it('rejects tenantless create (fail closed)', async () => {
      await expect(service.create({ workOrderId: 'wo-1', severity: 'MAJOR', description: 'x' }, { ...user, tenantId: null })).rejects.toThrow(ForbiddenException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rejects tenantless findOne (fail closed)', async () => {
      await expect(service.findOne('ncr-1', undefined)).rejects.toThrow(ForbiddenException);
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('rejects tenantless transition (fail closed)', async () => {
      await expect(service.transition('ncr-1', NcrStatus.CLOSED, { ...user, tenantId: null })).rejects.toThrow(ForbiddenException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('returns 404 for an NCR of another tenant and never mutates it', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.transition('ncr-x', NcrStatus.CLOSED, { ...user, tenantId: 't-2' })).rejects.toThrow(NotFoundException);
      expect(repo.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'ncr-x', tenantId: 't-2' }) }));
      expect(repo.update).not.toHaveBeenCalled();
      expect(outboxRows.length).toBe(0);
    });

    it('persists the caller tenant on create', async () => {
      await service.create({ workOrderId: 'wo-1', severity: 'MINOR', description: 'x' }, user);
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 't-1' }));
    });

    it('updates only within the caller tenant', async () => {
      repo.findOne.mockResolvedValue({ ...ncr });
      await service.update('ncr-1', { severity: 'CRITICAL' }, user);
      expect(repo.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'ncr-1', tenantId: 't-1' }), expect.objectContaining({ severity: 'CRITICAL' }));
    });
  });
});
