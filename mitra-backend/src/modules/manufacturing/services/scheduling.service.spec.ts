import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JobCard, JobCardStatus } from '../entities/jobcard.entity';
import { WorkOrder } from '../entities/workorder.entity';
import { SchedulingService } from './scheduling.service';
import { MachineMasterService } from '@modules/machine/services/machinemaster.service';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';

const user: any = { id: 'u-1', email: 'ops@mitra.io', role: 'PLANNING', tenantId: 't-1', permissions: [] };

describe('SchedulingService', () => {
  let service: SchedulingService;
  let machineService: any;
  let outbox: any;
  const outboxRows: any[] = [];

  const job = {
    id: 'job-1', jobCardNumber: 'JC-WO-1', workOrderId: 'wo-1', operationId: 'op-1',
    status: JobCardStatus.OPEN, plannedHours: 8, tenantId: 't-1',
  };

  beforeEach(async () => {
    outboxRows.length = 0;
    const jobRepo = {
      findOne: jest.fn().mockResolvedValue({ ...job }),
      find: jest.fn().mockResolvedValue([{ ...job }]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(),
    };
    const woRepo = { findOne: jest.fn().mockResolvedValue({ id: 'wo-1', woNumber: 'WO-2026-0001' }) };
    machineService = {
      findOne: jest.fn().mockResolvedValue({ id: 'm-1', machineNumber: 'MC-01' }),
      findAll: jest.fn().mockResolvedValue({ data: [{ id: 'm-1', machineNumber: 'MC-01', machineName: 'CNC 1', machineTypeId: 'mt-1', status: 'ACTIVE' }], total: 1 }),
      createBooking: jest.fn().mockResolvedValue({ id: 'bk-1' }),
      listBookings: jest.fn().mockResolvedValue([]),
    };
    outbox = { append: jest.fn(async (eventType: string, aggregateType: string, aggregateId: string, payload: any, opts: any) => {
      outboxRows.push({ eventType, aggregateType, aggregateId, payload, opts });
      return { id: 'o-1' };
    }) };

    const dataSource = { query: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingService,
        { provide: getRepositoryToken(JobCard), useValue: jobRepo },
        { provide: getRepositoryToken(WorkOrder), useValue: woRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: MachineMasterService, useValue: machineService },
        { provide: OutboxService, useValue: outbox },
      ],
    }).compile();

    service = module.get(SchedulingService);
  });

  describe('assignToMachine', () => {
    it('assigns the machine, creates a booking and emits SCHEDULE_ASSIGNED', async () => {
      const result = await service.assignToMachine('job-1', 'm-1', user, {});
      expect(machineService.createBooking).toHaveBeenCalledWith(expect.objectContaining({ machineId: 'm-1', workOrderId: 'wo-1' }), user);
      expect(result.booking.id).toBe('bk-1');
      expect(outboxRows.some((r) => r.eventType === EngineeringDomainEventType.SCHEDULE_ASSIGNED)).toBe(true);
    });

    it('rejects assigning a terminal job', async () => {
      const jobRepo = (service as any).jobCardRepo;
      jobRepo.findOne.mockResolvedValue({ ...job, status: JobCardStatus.COMPLETED });
      await expect(service.assignToMachine('job-1', 'm-1', user, {})).rejects.toThrow();
    });
  });

  describe('batchSchedule', () => {
    it('auto-schedules unassigned job cards using the least-loaded machine', async () => {
      const dataSource = (service as any).dataSource;
      dataSource.query.mockImplementation(async (sql: string) => {
        if (sql.includes('engineering_operations')) return [{ machine_type_id: 'mt-1' }];
        if (sql.includes('machine_masters')) return [{ id: 'm-1', machine_number: 'MC-01' }];
        return [];
      });
      const result = await service.batchSchedule('wo-1', user);
      expect(result.scheduled).toBe(1);
      expect(machineService.createBooking).toHaveBeenCalled();
    });
  });

  describe('alternates', () => {
    it('returns machines of the same type as the job operation', async () => {
      const dataSource = (service as any).dataSource;
      dataSource.query.mockResolvedValue([{ machine_type_id: 'mt-1' }]);
      const result = await service.alternates('job-1', 't-1');
      expect(result).toHaveLength(1);
      expect(result[0].machineNumber).toBe('MC-01');
    });
  });
});
