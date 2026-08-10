import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProductionTrackingService } from './production-tracking.service';
import { WorkOrder, WorkOrderStatus } from '../entities/workorder.entity';
import { JobCard } from '../entities/jobcard.entity';
import { OperationLog } from '../entities/operationlog.entity';

describe('ProductionTrackingService', () => {
  let service: ProductionTrackingService;
  let woRepo: any;
  let jobRepo: any;
  let logRepo: any;

  const wos = [
    { id: 'wo-1', woNumber: 'WO-1', partName: 'A', status: WorkOrderStatus.IN_PROGRESS, plannedQty: 10, completedQty: 4, rejectedQty: 1, reworkQty: 0, scrapQty: 0, estimatedHours: 8, actualHours: 3, tenantId: 't-1', priority: 'HIGH' },
    { id: 'wo-2', woNumber: 'WO-2', partName: 'B', status: WorkOrderStatus.COMPLETED, plannedQty: 5, completedQty: 5, rejectedQty: 0, reworkQty: 0, scrapQty: 0, estimatedHours: 4, actualHours: 4, tenantId: 't-1', priority: 'NORMAL' },
  ];

  beforeEach(async () => {
    woRepo = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(wos.map((w) => ({ ...w }))),
      })),
      findOne: jest.fn().mockResolvedValue({ ...wos[0] }),
    };
    jobRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'job-1', workOrderId: 'wo-1', jobCardNumber: 'JC-1', operationNumber: 10, operationCode: 'OP10', status: 'IN_PROGRESS', machineId: 'm-1', operatorId: 'u-1', qtyPlanned: 10, producedQty: 4, rejectedQty: 1, reworkQty: 0, scrapQty: 0, startedAt: new Date(), completedAt: null, holdReason: null },
      ]),
    };
    logRepo = {
      find: jest.fn().mockResolvedValue([
        { workOrderId: 'wo-1', jobCardId: 'job-1', operationId: 'op-1', qtyProduced: 4, qtyRejected: 1, reworkQty: 0, scrapQty: 0, durationMinutes: 60, logDate: new Date(), endTime: new Date(), createdAt: new Date() },
      ]),
    };
    const dataSource = { query: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionTrackingService,
        { provide: getRepositoryToken(WorkOrder), useValue: woRepo },
        { provide: getRepositoryToken(JobCard), useValue: jobRepo },
        { provide: getRepositoryToken(OperationLog), useValue: logRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(ProductionTrackingService);
  });

  describe('dashboard', () => {
    it('rolls up status counts and quantities', async () => {
      const result = await service.dashboard({}, 't-1');
      expect(result.totalWorkOrders).toBe(2);
      expect(result.statusCounts.IN_PROGRESS).toBe(1);
      expect(result.statusCounts.COMPLETED).toBe(1);
      expect(result.quantities.planned).toBe(15);
      expect(result.quantities.completed).toBe(9);
      expect(result.quantities.rejected).toBe(1);
      expect(result.hours.actual).toBe(7);
    });
  });

  describe('board', () => {
    it('groups work orders by status with their job cards', async () => {
      const result = await service.board({}, 't-1');
      expect(result.IN_PROGRESS).toHaveLength(1);
      expect(result.IN_PROGRESS[0].jobs).toHaveLength(1);
      expect(result.IN_PROGRESS[0].jobs[0].jobCardNumber).toBe('JC-1');
      expect(result.COMPLETED).toHaveLength(1);
    });
  });

  describe('history', () => {
    it('builds the execution timeline of a work order', async () => {
      const result: any = await service.history('wo-1', 't-1');
      expect(result.workOrder.woNumber).toBe('WO-1');
      expect(result.jobs).toHaveLength(1);
      expect(result.logs).toHaveLength(1);
      expect(result.events.some((e: any) => e.type === 'OPERATION_LOG')).toBe(true);
    });
  });
});
