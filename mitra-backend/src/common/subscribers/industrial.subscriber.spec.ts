import { IndustrialSubscriber } from './industrial.subscriber';
import { IndustrialBaseEntity } from '../entities/industrial-base.entity';
import { requestContextStorage } from '../context/request-context';
import { InsertEvent, UpdateEvent, SoftRemoveEvent } from 'typeorm';

class FakeEntity extends IndustrialBaseEntity {}

function withContext<T>(ctx: { userId: string | null; tenantId: string | null }, fn: () => T): T {
  return requestContextStorage.run(ctx, fn);
}

describe('IndustrialSubscriber', () => {
  let subscriber: IndustrialSubscriber;

  beforeEach(() => {
    subscriber = new IndustrialSubscriber();
  });

  describe('listenTo', () => {
    it('listens to IndustrialBaseEntity', () => {
      expect(subscriber.listenTo()).toBe(IndustrialBaseEntity);
    });
  });

  describe('beforeInsert', () => {
    it('stamps createdBy, updatedBy, and tenantId from the request context', () => {
      const entity = new FakeEntity();
      const event = { entity } as unknown as InsertEvent<IndustrialBaseEntity>;

      withContext({ userId: 'user-1', tenantId: 'tenant-1' }, () => {
        subscriber.beforeInsert(event);
      });

      expect(entity.createdBy).toBe('user-1');
      expect(entity.updatedBy).toBe('user-1');
      expect(entity.tenantId).toBe('tenant-1');
    });

    it('does NOT overwrite tenantId if the entity already set one explicitly', () => {
      const entity = new FakeEntity();
      entity.tenantId = 'explicit-tenant';
      const event = { entity } as unknown as InsertEvent<IndustrialBaseEntity>;

      withContext({ userId: 'user-1', tenantId: 'tenant-1' }, () => {
        subscriber.beforeInsert(event);
      });

      expect(entity.tenantId).toBe('explicit-tenant');
    });

    it('leaves tenantId null when there is no request context (e.g. seed scripts)', () => {
      const entity = new FakeEntity();
      const event = { entity } as unknown as InsertEvent<IndustrialBaseEntity>;

      // No requestContextStorage.run(...) wrapper — simulates a seed script
      subscriber.beforeInsert(event);

      expect(entity.createdBy).toBeUndefined();
      expect(entity.updatedBy).toBeUndefined();
      // Never assigned, so it's undefined here (DB column default is NULL on insert)
      expect(entity.tenantId).toBeUndefined();
    });

    it('does not stamp tenantId when the context tenantId is null', () => {
      const entity = new FakeEntity();
      const event = { entity } as unknown as InsertEvent<IndustrialBaseEntity>;

      withContext({ userId: 'user-1', tenantId: null }, () => {
        subscriber.beforeInsert(event);
      });

      expect(entity.createdBy).toBe('user-1');
      // Never assigned, so it's undefined here (DB column default is NULL on insert)
      expect(entity.tenantId).toBeUndefined();
    });
  });

  describe('beforeUpdate', () => {
    it('stamps updatedBy from the request context', () => {
      const entity = new FakeEntity();
      const event = { entity } as unknown as UpdateEvent<IndustrialBaseEntity>;

      withContext({ userId: 'user-2', tenantId: 'tenant-1' }, () => {
        subscriber.beforeUpdate(event);
      });

      expect(entity.updatedBy).toBe('user-2');
    });
  });

  describe('beforeSoftRemove', () => {
    it('stamps updatedBy from the request context', () => {
      const entity = new FakeEntity();
      const event = { entity } as unknown as SoftRemoveEvent<IndustrialBaseEntity>;

      withContext({ userId: 'user-3', tenantId: 'tenant-1' }, () => {
        subscriber.beforeSoftRemove(event);
      });

      expect(entity.updatedBy).toBe('user-3');
    });
  });
});
