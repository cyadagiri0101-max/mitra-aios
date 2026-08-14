import { OutboxService } from './outbox.service';
import { DomainOutboxMessage, OutboxStatus } from '../entities/domain-outbox.entity';

describe('OutboxService', () => {
  let store: DomainOutboxMessage[];
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    count: jest.Mock;
    findOne: jest.Mock;
  };
  let service: OutboxService;

  const makeRow = (overrides: Partial<DomainOutboxMessage> = {}): DomainOutboxMessage =>
    ({
      id: 'row-1',
      eventType: 'customer.created',
      aggregateType: 'customer',
      aggregateId: '11111111-1111-1111-1111-111111111111',
      payload: { customerId: '11111111-1111-1111-1111-111111111111' },
      status: OutboxStatus.PENDING,
      attemptCount: 0,
      publishedAt: null,
      lastAttemptAt: null,
      errorMessage: null,
      availableAt: new Date(Date.now() - 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: '22222222-2222-2222-2222-222222222222',
      updatedBy: '22222222-2222-2222-2222-222222222222',
      tenantId: '33333333-3333-3333-3333-333333333333',
      ...overrides,
    }) as DomainOutboxMessage;

  beforeEach(() => {
    store = [];
    repo = {
      create: jest.fn((partial: any) => ({ id: 'row-1', ...partial })),
      save: jest.fn(async (row: DomainOutboxMessage) => {
        const idx = store.findIndex((r) => r.id === row.id);
        if (idx >= 0) store[idx] = row;
        else store.push(row);
        return row;
      }),
      find: jest.fn(async ({ where }: any) =>
        store.filter((r) => r.status === (where as any).status),
      ),
      count: jest.fn(async () => store.length),
      findOne: jest.fn(),
    };
    service = new OutboxService(repo as any);
  });

  describe('append', () => {
    it('creates a PENDING row with tenant and actor propagated', async () => {
      const row = await service.append('customer.created', 'customer', '11111111-1111-1111-1111-111111111111', {
        customerId: '11111111-1111-1111-1111-111111111111',
      }, {
        tenantId: '33333333-3333-3333-3333-333333333333',
        actorId: '22222222-2222-2222-2222-222222222222',
      });
      expect(repo.save).toHaveBeenCalled();
      expect(row.status).toBe(OutboxStatus.PENDING);
      expect(row.tenantId).toBe('33333333-3333-3333-3333-333333333333');
      expect(row.createdBy).toBe('22222222-2222-2222-2222-222222222222');
      expect(row.updatedBy).toBe('22222222-2222-2222-2222-222222222222');
    });

    it('appends through the provided transaction manager when one is passed', async () => {
      const em = {
        getRepository: jest.fn(() => ({
          save: jest.fn(async (row: DomainOutboxMessage) => row),
        })),
      };
      const row = await service.append('customer.created', 'customer', null, {}, { em: em as any });
      expect(em.getRepository).toHaveBeenCalledWith(DomainOutboxMessage);
      expect(row.status).toBe(OutboxStatus.PENDING);
    });
  });

  describe('relay', () => {
    it('persists PENDING -> PUBLISHED with attemptCount and lastAttemptAt on success', async () => {
      const row = makeRow();
      store.push(row);
      const dispatch = jest.fn().mockResolvedValue(undefined);

      const result = await service.relay(100, dispatch);

      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith(row);
      expect(result).toEqual({ relayed: 1, failed: 0 });
      expect(row.status).toBe(OutboxStatus.PUBLISHED);
      expect(row.publishedAt).toBeInstanceOf(Date);
      expect(row.attemptCount).toBe(1);
      expect(row.lastAttemptAt).toBeInstanceOf(Date);
      expect(repo.save).toHaveBeenCalledWith(row);
    });

    it('marks a failing dispatch as FAILED with error message and keeps attemptCount', async () => {
      const row = makeRow();
      store.push(row);
      const dispatch = jest.fn().mockRejectedValue(new Error('subscriber boom'));

      const result = await service.relay(100, dispatch);

      expect(result.failed).toBe(1);
      expect(row.status).toBe(OutboxStatus.FAILED);
      expect(row.errorMessage).toBe('subscriber boom');
      expect(row.attemptCount).toBe(1);
      expect(row.publishedAt).toBeNull();
    });

    it('skips PENDING rows whose availableAt is in the future', async () => {
      const row = makeRow({ availableAt: new Date(Date.now() + 60_000) });
      store.push(row);
      const dispatch = jest.fn().mockResolvedValue(undefined);

      const result = await service.relay(100, dispatch);

      expect(dispatch).not.toHaveBeenCalled();
      expect(result).toEqual({ relayed: 0, failed: 0 });
      expect(row.status).toBe(OutboxStatus.PENDING);
    });

    it('does not redispatch an already PUBLISHED row', async () => {
      const row = makeRow({
        status: OutboxStatus.PUBLISHED,
        publishedAt: new Date(),
        attemptCount: 1,
      });
      store.push(row);
      const dispatch = jest.fn().mockResolvedValue(undefined);

      const result = await service.relay(100, dispatch);

      expect(dispatch).not.toHaveBeenCalled();
      expect(result).toEqual({ relayed: 0, failed: 0 });
      expect(row.status).toBe(OutboxStatus.PUBLISHED);
      expect(row.attemptCount).toBe(1);
    });

    it('never writes a string sentinel into the uuid updatedBy column', async () => {
      const row = makeRow();
      store.push(row);
      await service.relay(100, jest.fn().mockResolvedValue(undefined));
      expect(row.updatedBy).toBe('22222222-2222-2222-2222-222222222222');
      expect(row.updatedBy).not.toBe('outbox-relay');
    });
  });

  describe('retryFailed', () => {
    it('re-arms FAILED rows to PENDING, clears the error and delays delivery', async () => {
      const row = makeRow({
        status: OutboxStatus.FAILED,
        errorMessage: 'boom',
        attemptCount: 1,
      });
      store.push(row);

      const rearmed = await service.retryFailed(100);

      expect(rearmed).toBe(1);
      expect(row.status).toBe(OutboxStatus.PENDING);
      expect(row.errorMessage).toBeNull();
      expect(row.availableAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('never writes a string sentinel into the uuid updatedBy column on retry', async () => {
      const row = makeRow({
        status: OutboxStatus.FAILED,
        errorMessage: 'boom',
      });
      store.push(row);
      await service.retryFailed(100);
      expect(row.updatedBy).toBe('22222222-2222-2222-2222-222222222222');
      expect(row.updatedBy).not.toBe('outbox-retry');
    });
  });

  describe('full lifecycle', () => {
    it('FAILED -> retryFailed -> relay -> PUBLISHED', async () => {
      const row = makeRow({
        status: OutboxStatus.FAILED,
        errorMessage: 'transient',
        attemptCount: 1,
      });
      store.push(row);
      const dispatch = jest.fn().mockResolvedValue(undefined);

      const rearmed = await service.retryFailed(100);
      expect(rearmed).toBe(1);
      expect(row.status).toBe(OutboxStatus.PENDING);

      const immediate = await service.relay(100, dispatch);
      expect(immediate).toEqual({ relayed: 0, failed: 0 });
      expect(dispatch).not.toHaveBeenCalled();

      row.availableAt = new Date(Date.now() - 1_000);
      const after = await service.relay(100, dispatch);
      expect(after).toEqual({ relayed: 1, failed: 0 });
      expect(row.status).toBe(OutboxStatus.PUBLISHED);
      expect(row.attemptCount).toBe(2);
      expect(row.errorMessage).toBeNull();
    });
  });
});
