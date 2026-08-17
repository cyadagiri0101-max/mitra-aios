import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ShopFloorService } from './shop-floor.service';
import { JobCard, JobCardStatus } from '../entities/jobcard.entity';
import { OperationLog } from '../entities/operationlog.entity';
import { WorkOrder, WorkOrderStatus } from '../entities/workorder.entity';
import { WorkflowService } from '@modules/workflow/services/workflow.service';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';

const user: any = { id: 'u-1', email: 'ops@mitra.io', role: 'PRODUCTION', tenantId: 't-1', permissions: ['manufacturing:job_card:start'] };

describe('ShopFloorService', () => {
  let service: ShopFloorService;
  let outbox: any;
  let workflow: any;
  const outboxRows: any[] = [];
  const savedLogs: any[] = [];

  const makeRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((d: any) => ({ ...d })),
    save: jest.fn((d: any) => Promise.resolve({ ...d, id: d.id ?? 'log-1' })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  });

  const job = {
    id: 'job-1', jobCardNumber: 'JC-WO-1', workOrderId: 'wo-1', operationId: 'op-1',
    status: JobCardStatus.OPEN, qtyPlanned: 10, producedQty: 0, rejectedQty: 0, reworkQty: 0, scrapQty: 0,
    actualHours: 0, downtimeMinutes: 0, setupTimeMinutes: 0, machineId: 'm-1', operatorId: 'u-1',
    startedAt: null, completedAt: null, holdReason: null, tenantId: 't-1',
  };
  const wo = {
    id: 'wo-1', woNumber: 'WO-2026-0001', partName: 'Core Insert', operationType: 'M',
    status: WorkOrderStatus.IN_PROGRESS, plannedQty: 10, completedQty: 0, rejectedQty: 0,
    reworkQty: 0, scrapQty: 0, actualHours: 0, tenantId: 't-1', projectId: null,
  };

  beforeEach(async () => {
    outboxRows.length = 0;
    savedLogs.length = 0;
    const jobRepo = makeRepo();
    jobRepo.findOne.mockResolvedValue({ ...job });
    const logRepo = makeRepo();
    logRepo.save.mockImplementation(async (d: any) => { savedLogs.push(d); return { ...d, id: 'log-1' }; });
    const woRepo = makeRepo();
    woRepo.findOne.mockResolvedValue({ ...wo });

    const em: any = {
      getRepository: jest.fn((entity: any) => {
        if (entity === JobCard) return jobRepo;
        if (entity === OperationLog) return logRepo;
        if (entity === WorkOrder) return woRepo;
        return makeRepo();
      }),
      query: jest.fn().mockResolvedValue([]),
    };

    outbox = { append: jest.fn(async (eventType: string, aggregateType: string, aggregateId: string, payload: any, opts: any) => {
      outboxRows.push({ eventType, aggregateType, aggregateId, payload, opts });
      return { id: 'o-1' };
    }) };

    workflow = {
      findInstanceByEntity: jest.fn().mockResolvedValue({ id: 'wf-1' }),
      executeTransition: jest.fn().mockResolvedValue({ id: 'wf-1', currentState: { stateCode: 'IN_PROGRESS' }, history: [{ fromState: 'OPEN', toState: 'IN_PROGRESS' }] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopFloorService,
        { provide: getRepositoryToken(JobCard), useValue: jobRepo },
        { provide: getRepositoryToken(OperationLog), useValue: logRepo },
        { provide: getRepositoryToken(WorkOrder), useValue: woRepo },
        { provide: DataSource, useValue: { transaction: jest.fn((cb: any) => cb(em)) } },
        { provide: WorkflowService, useValue: workflow },
        { provide: OutboxService, useValue: outbox },
      ],
    }).compile();

    service = module.get(ShopFloorService);
  });

  describe('startJob', () => {
    it('executes the job START transition and records the opening log', async () => {
      const result = await service.startJob('job-1', user, { operatorId: 'u-2', shift: 'A' });
      expect(workflow.executeTransition).toHaveBeenCalledWith('wf-1', expect.stringMatching(/^d4000000-/), expect.anything(), expect.anything());
      expect(result.status).toBe('IN_PROGRESS');
      expect(savedLogs).toHaveLength(1);
      expect(savedLogs[0].jobCardId).toBe('job-1');
      expect(outboxRows.some((r) => r.eventType === EngineeringDomainEventType.JOB_STARTED)).toBe(true);
    });

    it('rejects starting without a workflow instance', async () => {
      workflow.findInstanceByEntity.mockResolvedValue(null);
      await expect(service.startJob('job-1', user, {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('logProduction', () => {
    it('rejects production on a non-running job', async () => {
      const jobRepo = (service as any).jobCardRepo;
      jobRepo.findOne.mockResolvedValue({ ...job, status: JobCardStatus.OPEN });
      await expect(service.logProduction('job-1', user, { qtyProduced: 5 })).rejects.toThrow(BadRequestException);
    });

    it('accumulates quantities and rolls up the work order', async () => {
      const jobRepo = (service as any).jobCardRepo;
      jobRepo.findOne.mockResolvedValue({ ...job, status: JobCardStatus.IN_PROGRESS, startedAt: new Date(Date.now() - 3600000) });
      jobRepo.find.mockResolvedValue([{ ...job, status: JobCardStatus.IN_PROGRESS, producedQty: 4, rejectedQty: 1 }]);
      const logRepo = (service as any).operationLogRepo;
      logRepo.find.mockResolvedValue([
        { qtyProduced: 4, qtyRejected: 1, reworkQty: 0, scrapQty: 0, machineDowntimeMinutes: 5, setupTimeMinutes: 10, durationMinutes: 60 },
      ]);

      const result = await service.logProduction('job-1', user, { qtyProduced: 4, qtyRejected: 1, downtimeMinutes: 5 });

      expect(result.totals).toEqual({ produced: 4, rejected: 1, rework: 0, scrap: 0, downtime: 5, setup: 10, duration: 60 });
      expect(jobRepo.update).toHaveBeenCalledWith('job-1', expect.objectContaining({ producedQty: 4, rejectedQty: 1, actualHours: 1 }));
      expect(outboxRows.some((r) => r.eventType === EngineeringDomainEventType.MATERIAL_CONSUMED && r.payload.qtyProduced === 4)).toBe(true);
      const woRepo = (service as any).workOrderRepo;
      expect(woRepo.update).toHaveBeenCalledWith('wo-1', expect.objectContaining({ completedQty: 3 }));
    });
  });

  describe('transitionJob', () => {
    it('maps job states to events and patches the card', async () => {
      workflow.executeTransition.mockResolvedValue({ id: 'wf-1', currentState: { stateCode: 'ON_HOLD' } });
      const result = await service.transitionJob('job-1', 'HOLD', user, { holdReason: 'Tool breakage' });
      expect(result.status).toBe('ON_HOLD');
      const jobRepo = (service as any).jobCardRepo;
      expect(jobRepo.update).toHaveBeenCalledWith('job-1', expect.objectContaining({ status: 'ON_HOLD', holdReason: 'Tool breakage' }));
      expect(outboxRows.some((r) => r.eventType === EngineeringDomainEventType.JOB_HOLD)).toBe(true);
    });

    it('completing the job emits JOB_COMPLETED', async () => {
      workflow.executeTransition.mockResolvedValue({ id: 'wf-1', currentState: { stateCode: 'COMPLETED' } });
      await service.transitionJob('job-1', 'COMPLETE', user, {});
      expect(outboxRows.some((r) => r.eventType === EngineeringDomainEventType.JOB_COMPLETED)).toBe(true);
    });

    it('captures completedQuantity and scrapQuantity during completion and saves operation log', async () => {
      workflow.executeTransition.mockResolvedValue({ id: 'wf-1', currentState: { stateCode: 'COMPLETED' } });
      const logRepo = (service as any).operationLogRepo;
      logRepo.find.mockResolvedValue([
        { qtyProduced: 9, qtyRejected: 0, reworkQty: 0, scrapQty: 1, machineDowntimeMinutes: 0, setupTimeMinutes: 0, durationMinutes: 45 },
      ]);
      const result = await service.transitionJob('job-1', 'COMPLETE', user, {
        completedQuantity: 9,
        scrapQuantity: 1,
        remarks: 'Finished machining batch cleanly',
      });
      expect(result.status).toBe('COMPLETED');
      expect(savedLogs.length).toBeGreaterThan(0);
      const lastLog = savedLogs[savedLogs.length - 1];
      expect(lastLog.qtyProduced).toBe(9);
      expect(lastLog.scrapQty).toBe(1);
    });
  });

  describe('roll-up auto-complete', () => {
    it('completes the work order when all jobs are terminal', async () => {
      const jobRepo = (service as any).jobCardRepo;
      jobRepo.findOne.mockResolvedValue({ ...job, status: JobCardStatus.COMPLETED, producedQty: 9, rejectedQty: 1, actualHours: 2 });
      jobRepo.find.mockResolvedValue([
        { status: JobCardStatus.COMPLETED, producedQty: 9, rejectedQty: 1, reworkQty: 0, scrapQty: 0, actualHours: 2 },
      ]);
      workflow.findInstanceByEntity.mockResolvedValue({ id: 'wf-wo' });
      workflow.executeTransition.mockResolvedValue({ id: 'wf-wo', currentState: { stateCode: 'COMPLETED' } });

      await service.startJob('job-1', user, {});

      const woRepo = (service as any).workOrderRepo;
      expect(woRepo.update).toHaveBeenCalledWith('wo-1', expect.objectContaining({ status: 'COMPLETED', completedQty: 8 }));
      expect(outboxRows.some((r) => r.eventType === EngineeringDomainEventType.WORK_ORDER_COMPLETED)).toBe(true);
    });
  });

  describe('tenant isolation', () => {
    it('rejects startJob without tenant context', async () => {
      const tenantless = { id: 'u-1', email: 'ops@mitra.io', role: 'PRODUCTION', tenantId: null, permissions: [] };
      await expect(service.startJob('job-1', tenantless, {})).rejects.toThrow(ForbiddenException);
    });

    it('rejects logProduction without tenant context', async () => {
      const tenantless = { id: 'u-1', email: 'ops@mitra.io', role: 'PRODUCTION', tenantId: null, permissions: [] };
      await expect(service.logProduction('job-1', tenantless, { qtyProduced: 1 })).rejects.toThrow(ForbiddenException);
    });

    it('rejects transitionJob without tenant context', async () => {
      const tenantless = { id: 'u-1', email: 'ops@mitra.io', role: 'PRODUCTION', tenantId: null, permissions: [] };
      await expect(service.transitionJob('job-1', 'HOLD', tenantless, {})).rejects.toThrow(ForbiddenException);
    });
  });
});
