import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MachineMasterService } from './machinemaster.service';
import { MachineMaster, MachineStatus } from '../entities/machinemaster.entity';
import { MachineCalendar } from '../entities/machinecalendar.entity';
import { MachineBooking } from '../entities/machinebooking.entity';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';

const user: any = { id: 'u-1', email: 'main@mitra.io', role: 'MANAGEMENT', tenantId: 't-1', permissions: [] };

describe('MachineMasterService', () => {
  let service: MachineMasterService;
  let outbox: any;
  let machineRepo: any;
  const outboxRows: any[] = [];

  const machine = {
    id: 'm-1', machineNumber: 'MC-01', machineName: 'CNC 1', machineTypeId: 'mt-1',
    status: MachineStatus.ACTIVE, lastMaintenanceDate: null, nextMaintenanceDate: null,
    remarks: null, tenantId: 't-1',
  };

  beforeEach(async () => {
    outboxRows.length = 0;
    machineRepo = {
      findOne: jest.fn().mockResolvedValue({ ...machine }),
      create: jest.fn((d: any) => ({ ...d })),
      save: jest.fn(async (d: any) => ({ ...d, id: 'm-9' })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ ...machine }], 1]),
      })),
    };
    const calendarRepo = {
      findOne: jest.fn(),
      create: jest.fn((d: any) => ({ ...d })),
      save: jest.fn(async (d: any) => ({ ...d, id: 'cal-1' })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };
    const bookingRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'bk-1', machineId: 'm-1', startDatetime: new Date(), endDatetime: new Date() }),
      create: jest.fn((d: any) => ({ ...d })),
      save: jest.fn(async (d: any) => ({ ...d, id: 'bk-9' })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };
    outbox = { append: jest.fn(async (eventType: string, aggregateType: string, aggregateId: string, payload: any, opts: any) => {
      outboxRows.push({ eventType, aggregateType, aggregateId, payload, opts });
      return { id: 'o-1' };
    }) };
    const dataSource = { query: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MachineMasterService,
        { provide: getRepositoryToken(MachineMaster), useValue: machineRepo },
        { provide: getRepositoryToken(MachineCalendar), useValue: calendarRepo },
        { provide: getRepositoryToken(MachineBooking), useValue: bookingRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: OutboxService, useValue: outbox },
      ],
    }).compile();

    service = module.get(MachineMasterService);
  });

  describe('CRUD', () => {
    it('creates a machine with ACTIVE default and tenant stamps', async () => {
      const result = await service.create({ machineNumber: 'MC-02', machineName: 'Lathe 1' }, user);
      expect(result.tenantId).toBe('t-1');
      expect(result.createdBy).toBe('u-1');
      expect(result.status).toBe(MachineStatus.ACTIVE);
    });

    it('paginates machine listing', async () => {
      const result = await service.findAll({ page: 1, limit: 20 }, 't-1');
      expect(result.total).toBe(1);
      expect(result.data[0].machineNumber).toBe('MC-01');
    });
  });

  describe('setMaintenance', () => {
    it('moves the machine into maintenance and emits MACHINE_MAINTENANCE', async () => {
      await service.setMaintenance('m-1', user, { maintenance: true });
      expect(machineRepo.update).toHaveBeenCalledWith('m-1', expect.objectContaining({ status: MachineStatus.UNDER_MAINTENANCE, lastMaintenanceDate: expect.any(Date) }));
      expect(outboxRows.some((r) => r.eventType === EngineeringDomainEventType.MACHINE_MAINTENANCE)).toBe(true);
    });

    it('reactivates the machine and emits MACHINE_STOPPED', async () => {
      await service.setMaintenance('m-1', user, { maintenance: false });
      expect(machineRepo.update).toHaveBeenCalledWith('m-1', expect.objectContaining({ status: MachineStatus.ACTIVE }));
      expect(outboxRows.some((r) => r.eventType === EngineeringDomainEventType.MACHINE_STOPPED)).toBe(true);
    });
  });

  describe('utilization', () => {
    it('computes booked vs available hours', async () => {
      const dataSource = (service as any).dataSource;
      dataSource.query.mockImplementation(async (sql: string) => {
        if (sql.includes('machine_bookings')) return [{ booked_hours: 40 }];
        if (sql.includes('machine_calendars')) return [{ available_hours: 80 }];
        return [];
      });
      const result = await service.utilization('m-1', { from: '2026-08-01', to: '2026-08-10' }, 't-1');
      expect(result.bookedHours).toBe(40);
      expect(result.availableHours).toBe(80);
      expect(result.utilizationPct).toBe(50);
    });
  });

  describe('nextAvailable', () => {
    it('suggests the first gap large enough for the requested duration', async () => {
      const dataSource = (service as any).dataSource;
      dataSource.query.mockResolvedValue([
        { start_datetime: new Date(Date.now() + 3600000), end_datetime: new Date(Date.now() + 7200000) },
      ]);
      const result = await service.nextAvailable('m-1', 120, 't-1');
      expect(result.requestedMinutes).toBe(120);
      expect(new Date(result.suggestedStart).getTime()).toBeGreaterThanOrEqual(Date.now() - 1000);
      expect(new Date(result.suggestedEnd).getTime()).toBeGreaterThan(new Date(result.suggestedStart).getTime());
    });
  });

  describe('queue', () => {
    it('queries the shop-floor queue for the machine', async () => {
      const dataSource = (service as any).dataSource;
      dataSource.query.mockResolvedValue([{ id: 'job-1', job_card_number: 'JC-1', status: 'IN_PROGRESS' }]);
      const result = await service.queue('m-1', 't-1');
      expect(result).toHaveLength(1);
      expect(result[0].job_card_number).toBe('JC-1');
    });
  });
});
