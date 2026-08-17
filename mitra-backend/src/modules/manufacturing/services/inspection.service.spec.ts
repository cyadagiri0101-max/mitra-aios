import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { InspectionService } from './inspection.service';
import { InspectionCheckpoint, CheckpointStatus } from '../entities/inspection-checkpoint.entity';
import { WorkOrder } from '../entities/workorder.entity';
import { NcrService } from '@modules/quality/services/ncr.service';
import { NcrSeverity } from '@modules/quality/entities/ncr-record.entity';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';

const user: any = { id: 'u-1', email: 'qc@mitra.io', role: 'QUALITY', tenantId: 't-1', permissions: [] };

describe('InspectionService', () => {
  let service: InspectionService;
  let ncrService: any;
  let outbox: any;
  const outboxRows: any[] = [];

  const checkpoint = {
    id: 'cp-1', checkpointNumber: '10.1', workOrderId: 'wo-1', operationId: 'op-1',
    operationNumber: 10, operationCode: 'OP10', checkpointName: 'OD', dimension: 'OD 50mm',
    tolerance: '±0.02', isCritical: false, status: CheckpointStatus.PENDING,
    measuredValue: null, inspectedBy: null, inspectedAt: null, inspectionReportId: null, remarks: null,
    tenantId: 't-1',
  };

  beforeEach(async () => {
    outboxRows.length = 0;
    const cpRepo = {
      findOne: jest.fn().mockResolvedValue({ ...checkpoint }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ ...checkpoint, status: CheckpointStatus.PASS }, { ...checkpoint, id: 'cp-2', status: CheckpointStatus.FAIL, isCritical: true }]),
      })),
    };
    const woRepo = { findOne: jest.fn().mockResolvedValue({ id: 'wo-1', projectId: 'p-1', partId: 'part-1', drawingId: 'd-1', bomItemId: 'bi-1' }) };
    ncrService = {
      create: jest.fn(async (dto: any, u: any) => ({ id: 'ncr-1', ncrNumber: 'NCR-1', ...dto })),
    };
    outbox = { append: jest.fn(async (eventType: string, aggregateType: string, aggregateId: string, payload: any, opts: any) => {
      outboxRows.push({ eventType, aggregateType, aggregateId, payload, opts });
      return { id: 'o-1' };
    }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InspectionService,
        { provide: getRepositoryToken(InspectionCheckpoint), useValue: cpRepo },
        { provide: getRepositoryToken(WorkOrder), useValue: woRepo },
        { provide: NcrService, useValue: ncrService },
        { provide: OutboxService, useValue: outbox },
      ],
    }).compile();

    service = module.get(InspectionService);
  });

  describe('recordResult', () => {
    it('records a PASS without raising an NCR', async () => {
      const cpRepo = (service as any).checkpointRepo;
      cpRepo.findOne.mockResolvedValue({ ...checkpoint });
      await service.recordResult('cp-1', user, { result: CheckpointStatus.PASS, measuredValue: '50.01' });
      expect(cpRepo.update).toHaveBeenCalledWith({ id: 'cp-1', tenantId: 't-1' }, expect.objectContaining({ status: 'PASS', inspectedBy: 'u-1' }));
      expect(ncrService.create).not.toHaveBeenCalled();
    });

    it('raises an MAJOR NCR on FAIL and emits INSPECTION_FAILED', async () => {
      await service.recordResult('cp-1', user, { result: CheckpointStatus.FAIL, measuredValue: '50.5' });
      expect(ncrService.create).toHaveBeenCalledWith(expect.objectContaining({ workOrderId: 'wo-1', severity: NcrSeverity.MAJOR, ncrType: 'INTERNAL' }), user);
      expect(outboxRows.some((r) => r.eventType === EngineeringDomainEventType.INSPECTION_FAILED && r.payload.ncrId === 'ncr-1')).toBe(true);
    });

    it('raises a CRITICAL NCR for critical checkpoints', async () => {
      const cpRepo = (service as any).checkpointRepo;
      cpRepo.findOne.mockResolvedValue({ ...checkpoint, isCritical: true });
      await service.recordResult('cp-1', user, { result: CheckpointStatus.FAIL });
      expect(ncrService.create).toHaveBeenCalledWith(expect.objectContaining({ severity: NcrSeverity.CRITICAL }), user);
    });
    it('records a PASS using the status payload alias', async () => {
      const cpRepo = (service as any).checkpointRepo;
      cpRepo.findOne.mockResolvedValue({ ...checkpoint });
      await service.recordResult('cp-1', user, { status: CheckpointStatus.PASS, measuredValue: '50.01' });
      expect(cpRepo.update).toHaveBeenCalledWith({ id: 'cp-1', tenantId: 't-1' }, expect.objectContaining({ status: 'PASS', inspectedBy: 'u-1' }));
    });
  });

  describe('summary', () => {
    it('counts checkpoint statuses and flags critical fails with top-level fields', async () => {
      const result = await service.summary('wo-1', 't-1');
      expect(result.total).toBe(2);
      expect(result.counts.PASS).toBe(1);
      expect(result.counts.FAIL).toBe(1);
      expect(result.passed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.criticalFails).toBe(1);
      expect(result.allPassed).toBe(false);
    });
  });

  describe('tenant isolation', () => {
    it('rejects recordResult without tenant context', async () => {
      const tenantless = { id: 'u-1', email: 'qc@mitra.io', role: 'QUALITY', tenantId: null, permissions: [] };
      await expect(service.recordResult('cp-1', tenantless, { result: CheckpointStatus.PASS })).rejects.toThrow(ForbiddenException);
    });
  });
});
