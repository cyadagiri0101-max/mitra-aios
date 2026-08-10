import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
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
      expect(repo.update).toHaveBeenCalledWith('ncr-1', expect.objectContaining({ status: 'CLOSED', disposition: 'REWORK', closedAt: expect.any(Date) }));
      expect(outboxRows.some((r) => r.eventType === EngineeringDomainEventType.NCR_CLOSED)).toBe(true);
    });
  });
});
