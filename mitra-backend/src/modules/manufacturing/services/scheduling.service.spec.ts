import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JobCard, JobCardStatus } from '../entities/jobcard.entity';
import { WorkOrder } from '../entities/workorder.entity';
import { SchedulingService } from './scheduling.service';
import { MachineMasterService } from '@modules/machine/services/machinemaster.service';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const user: any = { id: 'u-1', email: 'ops@mitra.io', role: 'PLANNING', tenantId: 't-1', permissions: [] };

describe('SchedulingService', () => {
  let service: SchedulingService;
  let jobRepo: any;
  let woRepo: any;
  let machineService: any;
  let outbox: any;
  const outboxRows: any[] = [];

  const job = {
    id: 'job-1', jobCardNumber: 'JC-WO-1', workOrderId: 'wo-1', operationId: 'op-1',
    status: JobCardStatus.OPEN, plannedHours: 8, tenantId: 't-1',
  };

  beforeEach(async () => {
    outboxRows.length = 0;
    jobRepo = {
      findOne: jest.fn(async (opts: any) => {
        const w = opts?.where ?? {};
        return w.id === 'job-1' ? { ...job } : undefined;
      }),
      find: jest.fn().mockResolvedValue([{ ...job }]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(),
    };
    woRepo = {
      findOne: jest.fn(async (opts: any) => {
        const w = opts?.where ?? {};
        return w.id === 'wo-1' ? { id: 'wo-1', woNumber: 'WO-2026-0001' } : undefined;
      }),
    };
    machineService = {
      findOne: jest.fn(async (id: string) => {
        if (id !== 'm-1') throw new NotFoundException('Machine not found');
        return { id: 'm-1', machineNumber: 'MC-01' };
      }),
      findAll: jest.fn().mockResolvedValue({ data: [{ id: 'm-1', machineNumber: 'MC-01', machineName: 'CNC 1', machineTypeId: 'mt-1', status: 'ACTIVE' }], total: 1 }),
      createBooking: jest.fn().mockResolvedValue({ id: 'bk-1' }),
      listBookings: jest.fn().mockResolvedValue([]),
    };
    outbox = { append: jest.fn(async (eventType: string, aggregateType: string, aggregateId: string, payload: any, opts: any) => {
      outboxRows.push({ eventType, aggregateType, aggregateId, payload, opts });
      return { id: 'o-1' };
    }) };

    const emMock: any = {
      getRepository: jest.fn((token: any) => {
        if (token === JobCard) return jobRepo;
        if (token === WorkOrder) return woRepo;
        return jobRepo;
      }),
      query: jest.fn().mockResolvedValue([]),
    };
    const dataSource = {
      query: jest.fn().mockResolvedValue([]),
      transaction: jest.fn(async (cb: any) => cb(emMock)),
    };

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

  describe('tenantless writes fail closed', () => {
    it('assignToMachine without tenant context', async () => {
      const tenantless = { id: 'u-1', email: 'ops@mitra.io', role: 'PLANNING', tenantId: null, permissions: [] };
      await expect(service.assignToMachine('job-1', 'm-1', tenantless, {})).rejects.toThrow(ForbiddenException);
    });

    it('batchSchedule without tenant context', async () => {
      const tenantless = { id: 'u-1', email: 'ops@mitra.io', role: 'PLANNING', tenantId: null, permissions: [] };
      await expect(service.batchSchedule('wo-1', tenantless)).rejects.toThrow(ForbiddenException);
    });

    it('alternates without tenant context', async () => {
      await expect(service.alternates('job-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cross-tenant isolation', () => {
    it('A: tenant A cannot assign a tenant B job card - no mutation', async () => {
      await expect(service.assignToMachine('job-b', 'm-1', user, {})).rejects.toThrow(NotFoundException);
      expect(jobRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ id: 'job-b', tenantId: 't-1' }),
      }));
      expect(jobRepo.update).not.toHaveBeenCalled();
      expect(machineService.createBooking).not.toHaveBeenCalled();
      expect(outboxRows).toHaveLength(0);
    });

    it('A2: tenant A cannot assign a tenant B job even when a tenant B row exists', async () => {
      jobRepo.findOne.mockImplementation(async (opts: any) => {
        const w = opts?.where ?? {};
        return w.id === 'job-b' && w.tenantId === 't-b' ? { ...job, id: 'job-b', tenantId: 't-b' } : undefined;
      });
      await expect(service.assignToMachine('job-b', 'm-1', user, {})).rejects.toThrow(NotFoundException);
      expect(jobRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ id: 'job-b', tenantId: 't-1' }),
      }));
      expect(jobRepo.update).not.toHaveBeenCalled();
      expect(machineService.createBooking).not.toHaveBeenCalled();
      expect(outboxRows).toHaveLength(0);
    });

    it('B: tenant A cannot batch-schedule a tenant B work order', async () => {
      await expect(service.batchSchedule('wo-b', user)).rejects.toThrow(NotFoundException);
      expect(woRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ id: 'wo-b', tenantId: 't-1' }),
      }));
      expect(jobRepo.find).not.toHaveBeenCalled();
      expect(machineService.createBooking).not.toHaveBeenCalled();
    });

    it('C: tenant A cannot retrieve alternates for a tenant B job', async () => {
      await expect(service.alternates('job-b', 't-1')).rejects.toThrow(NotFoundException);
      expect(jobRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ id: 'job-b', tenantId: 't-1' }),
      }));
      expect(machineService.findAll).not.toHaveBeenCalled();
    });

    it('D: tenant A cannot select a tenant B machine - booking never created', async () => {
      jobRepo.findOne.mockResolvedValue({ ...job });
      await expect(service.assignToMachine('job-1', 'm-b', user, {})).rejects.toThrow(NotFoundException);
      expect(machineService.findOne).toHaveBeenCalledWith('m-b', 't-1');
      expect(jobRepo.update).not.toHaveBeenCalled();
      expect(machineService.createBooking).not.toHaveBeenCalled();
      expect(outboxRows).toHaveLength(0);
    });

    it('F: same-tenant scheduling still succeeds with tenant-scoped queries', async () => {
      const dataSource = (service as any).dataSource;
      dataSource.query.mockImplementation(async (sql: string) => {
        if (sql.includes('engineering_operations')) return [{ machine_type_id: 'mt-1' }];
        if (sql.includes('machine_masters')) return [{ id: 'm-1', machine_number: 'MC-01' }];
        return [];
      });
      const result = await service.batchSchedule('wo-1', user);
      expect(result.scheduled).toBe(1);
      expect(woRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ id: 'wo-1', tenantId: 't-1' }),
      }));
      expect(jobRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ workOrderId: 'wo-1', tenantId: 't-1' }),
      }));
      expect(jobRepo.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'job-1', tenantId: 't-1' }), expect.anything());
      expect(outboxRows.some((r) => r.eventType === EngineeringDomainEventType.SCHEDULE_ASSIGNED)).toBe(true);
    });

    it('G: machine load calculation only counts job cards of the current tenant', async () => {
      const dataSource = (service as any).dataSource;
      const machineQueries: Array<{ sql: string; params: any[] }> = [];
      dataSource.query.mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('machine_masters')) {
          machineQueries.push({ sql, params });
          return [{ id: 'm-1', machine_number: 'MC-01' }];
        }
        if (sql.includes('engineering_operations')) return [{ machine_type_id: 'mt-1' }];
        return [];
      });
      const result = await service.batchSchedule('wo-1', user);
      expect(result.scheduled).toBe(1);
      expect(machineQueries).toHaveLength(1);
      expect(machineQueries[0].params).toEqual(['mt-1', 't-1']);
      expect(machineQueries[0].sql).toContain('LEFT JOIN job_cards jc');
      expect(machineQueries[0].sql).toContain('jc.tenant_id = $2');
      expect(machineQueries[0].sql).toContain('m.tenant_id = $2');
      expect(machineQueries[0].sql).toContain('COUNT(jc.id)');
    });
  });
});