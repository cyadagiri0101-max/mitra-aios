import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DispatchService } from './dispatch.service';
import { DispatchPlan, DispatchStatus } from '../entities/dispatchplan.entity';
import { OutboxService } from '../../platform/services/outbox.service';
import { EngineeringDomainEventType } from '../../engineering/events/engineering.events';

const makeRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((d: any) => ({ ...d })),
  save: jest.fn((e: any) => Promise.resolve({ id: e.id ?? 'dispatch-1', ...e })),
});

const makePlan = (overrides: Partial<DispatchPlan> = {}) => ({
  id: 'dispatch-1',
  dispatchNumber: 'DISP-TEST-1',
  projectId: 'proj-1',
  customerName: 'AeroTech',
  status: DispatchStatus.PLANNING,
  carrier: null,
  trackingNumber: null,
  shippedDate: null,
  deliveredDate: null,
  packingList: null,
  notes: null,
  tenantId: 'tenant-1',
  ...overrides,
});

describe('DispatchService — W1 dispatch state machine', () => {
  let service: DispatchService;
  let planRepo: ReturnType<typeof makeRepo>;
  let em: { getRepository: jest.Mock };
  let outbox: { append: jest.Mock };
  const user = { id: 'user-1', tenantId: 'tenant-1', email: 'u@mitra.local' };

  beforeEach(async () => {
    planRepo = makeRepo();
    outbox = { append: jest.fn().mockResolvedValue({ id: 'outbox-1' }) };
    em = {
      getRepository: jest.fn((entity: any) => {
        if (entity === DispatchPlan) return planRepo;
        throw new Error('Unexpected entity in transaction');
      }),
    };
    const dataSource = { transaction: jest.fn(async (cb: (em: any) => unknown) => cb(em)) } as unknown as DataSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchService,
        { provide: getRepositoryToken(DispatchPlan), useValue: planRepo },
        { provide: OutboxService, useValue: outbox },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = module.get<DispatchService>(DispatchService);
    jest.clearAllMocks();
  });

  it('creates a dispatch in PLANNING with generated number and emits DISPATCH_CREATED', async () => {
    planRepo.save.mockResolvedValue(makePlan());
    const result = await service.create({ customerName: 'AeroTech', projectId: 'proj-1' }, 'user-1', 'tenant-1');
    expect(result.status).toBe(DispatchStatus.PLANNING);
    expect(result.dispatchNumber).toBeDefined();
    expect(result.tenantId).toBe('tenant-1');
    expect(outbox.append).toHaveBeenCalledWith(
      EngineeringDomainEventType.DISPATCH_CREATED,
      'dispatch_plan',
      expect.any(String),
      expect.objectContaining({ projectId: 'proj-1' }),
      expect.objectContaining({ tenantId: 'tenant-1', actorId: 'user-1' }),
    );
  });

  it('PACK transitions PLANNING → PACKED', async () => {
    planRepo.findOne.mockResolvedValue(makePlan());
    const result = await service.transition('dispatch-1', user as any, { transition: 'PACK' });
    expect(result.status).toBe(DispatchStatus.PACKED);
    expect(outbox.append).toHaveBeenCalledWith(
      EngineeringDomainEventType.DISPATCH_PACKED,
      'dispatch_plan',
      'dispatch-1',
      expect.anything(),
      expect.anything(),
    );
  });

  it('rejects PACK from a non-PLANNING status', async () => {
    planRepo.findOne.mockResolvedValue(makePlan({ status: DispatchStatus.PACKED }));
    await expect(service.transition('dispatch-1', user as any, { transition: 'PACK' })).rejects.toThrow(BadRequestException);
  });

  it('rejects SHIP directly from PLANNING (strict chain PLANNING → PACK → SHIP)', async () => {
    planRepo.findOne.mockResolvedValue(makePlan());
    await expect(
      service.transition('dispatch-1', user as any, { transition: 'SHIP', carrier: 'BlueDart', trackingNumber: 'BDF-1' }),
    ).rejects.toThrow(/PACKED/);
  });

  it('rejects SHIP without carrier and tracking number', async () => {
    planRepo.findOne.mockResolvedValue(makePlan({ status: DispatchStatus.PACKED }));
    await expect(service.transition('dispatch-1', user as any, { transition: 'SHIP' })).rejects.toThrow(BadRequestException);
    await expect(
      service.transition('dispatch-1', user as any, { transition: 'SHIP', carrier: 'BlueDart' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.transition('dispatch-1', user as any, { transition: 'SHIP', trackingNumber: 'BDF-1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('SHIP records carrier, tracking number and shippedDate', async () => {
    planRepo.findOne.mockResolvedValue(makePlan({ status: DispatchStatus.PACKED }));
    const result = await service.transition('dispatch-1', user as any, {
      transition: 'SHIP',
      carrier: 'BlueDart',
      trackingNumber: 'BDF-883920194-IN',
    });
    expect(result.status).toBe(DispatchStatus.SHIPPED);
    expect(result.carrier).toBe('BlueDart');
    expect(result.trackingNumber).toBe('BDF-883920194-IN');
    expect(result.shippedDate).toBeDefined();
    expect(outbox.append).toHaveBeenCalledWith(
      EngineeringDomainEventType.DISPATCH_SHIPPED,
      'dispatch_plan',
      'dispatch-1',
      expect.objectContaining({ carrier: 'BlueDart', trackingNumber: 'BDF-883920194-IN' }),
      expect.anything(),
    );
  });

  it('rejects DELIVER unless SHIPPED (PLANNING → DELIVERED and PACKED → DELIVERED are invalid)', async () => {
    planRepo.findOne.mockResolvedValue(makePlan());
    await expect(service.transition('dispatch-1', user as any, { transition: 'DELIVER' })).rejects.toThrow(BadRequestException);
    planRepo.findOne.mockResolvedValue(makePlan({ status: DispatchStatus.PACKED }));
    await expect(service.transition('dispatch-1', user as any, { transition: 'DELIVER' })).rejects.toThrow(BadRequestException);
  });

  it('DELIVER records deliveredDate and emits DISPATCH_DELIVERED', async () => {
    planRepo.findOne.mockResolvedValue(makePlan({ status: DispatchStatus.SHIPPED }));
    const result = await service.transition('dispatch-1', user as any, { transition: 'DELIVER' });
    expect(result.status).toBe(DispatchStatus.DELIVERED);
    expect(result.deliveredDate).toBeDefined();
    expect(outbox.append).toHaveBeenCalledWith(
      EngineeringDomainEventType.DISPATCH_DELIVERED,
      'dispatch_plan',
      'dispatch-1',
      expect.objectContaining({ projectId: 'proj-1', deliveredDate: expect.any(Date) }),
      expect.objectContaining({ tenantId: 'tenant-1', actorId: 'user-1' }),
    );
  });

  it('CANCEL is rejected after DELIVERED', async () => {
    planRepo.findOne.mockResolvedValue(makePlan({ status: DispatchStatus.DELIVERED }));
    await expect(service.transition('dispatch-1', user as any, { transition: 'CANCEL' })).rejects.toThrow(BadRequestException);
  });

  it('CANCEL transitions a SHIPPED dispatch to CANCELLED', async () => {
    planRepo.findOne.mockResolvedValue(makePlan({ status: DispatchStatus.SHIPPED }));
    const result = await service.transition('dispatch-1', user as any, { transition: 'CANCEL' });
    expect(result.status).toBe(DispatchStatus.CANCELLED);
  });

  it('rejects unknown transitions', async () => {
    planRepo.findOne.mockResolvedValue(makePlan());
    await expect(service.transition('dispatch-1', user as any, { transition: 'EXPLODE' } as any)).rejects.toThrow(BadRequestException);
  });

  it('returns 404 for cross-tenant or missing dispatch (IDOR protection)', async () => {
    planRepo.findOne.mockResolvedValue(null);
    await expect(service.transition('dispatch-other', user as any, { transition: 'PACK' })).rejects.toThrow(NotFoundException);
    expect(planRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'dispatch-other', tenantId: 'tenant-1' }) }),
    );
    await expect(service.findOne('dispatch-other', 'tenant-1')).rejects.toThrow(NotFoundException);
  });

  it('create and transition stamp tenant and actor on outbox events', async () => {
    planRepo.findOne.mockResolvedValue(makePlan({ status: DispatchStatus.PACKED }));
    await service.transition('dispatch-1', user as any, { transition: 'SHIP', carrier: 'C', trackingNumber: 'T' });
    const [, , , , opts] = outbox.append.mock.calls[0];
    expect(opts).toEqual({ tenantId: 'tenant-1', actorId: 'user-1' });
  });
});