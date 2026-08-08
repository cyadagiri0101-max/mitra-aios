import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLog, AuditEventType } from '../entities/audit-log.entity';

const makeRepo = () => {
  const qb = {
    orderBy:       jest.fn().mockReturnThis(),
    skip:          jest.fn().mockReturnThis(),
    take:          jest.fn().mockReturnThis(),
    where:         jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
  return {
    create:               jest.fn((d: any) => d),
    save:                 jest.fn((e: any) => Promise.resolve({ id: 'audit-uuid', ...e })),
    find:                 jest.fn().mockResolvedValue([]),
    createQueryBuilder:   jest.fn().mockReturnValue(qb),
    _qb: qb,
  };
};

describe('AuditService', () => {
  let service: AuditService;
  let repo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    repo = makeRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLog), useValue: repo },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  // ── log() ──────────────────────────────────────────────────────────────────

  describe('log()', () => {
    const baseInput = {
      entityType: 'projects',
      entityId:   'proj-uuid',
      action:     'POST',
      userId:     'user-uuid',
      userEmail:  'admin@mitra.local',
      tenantId:   'tenant-uuid',
      ipAddress:  '192.168.1.1',
      userAgent:  'jest/test',
    };

    it('creates and saves an audit log record', async () => {
      const record = await service.log(baseInput);
      expect(repo.save).toHaveBeenCalled();
      expect(record.entityType).toBe('projects');
      expect(record.action).toBe('POST');
    });

    it('sets null for optional fields when not provided', async () => {
      const record = await service.log({
        entityType: 'capas',
        entityId:   'capa-uuid',
        action:     'DELETE',
      });
      expect(record.userId).toBeNull();
      expect(record.tenantId).toBeNull();
      expect(record.beforeState).toBeNull();
      expect(record.afterState).toBeNull();
    });

    it('persists beforeState and afterState snapshots', async () => {
      const before = { status: 'OPEN' };
      const after  = { status: 'CLOSED' };
      await service.log({ ...baseInput, beforeState: before, afterState: after });

      const saved = repo.save.mock.calls[0][0];
      expect(saved.beforeState).toEqual(before);
      expect(saved.afterState).toEqual(after);
    });

    it('persists ipAddress and userAgent', async () => {
      await service.log(baseInput);
      const saved = repo.save.mock.calls[0][0];
      expect(saved.ipAddress).toBe('192.168.1.1');
      expect(saved.userAgent).toBe('jest/test');
    });

    it('persists custom metadata', async () => {
      await service.log({ ...baseInput, metadata: { trialId: 't-123' } });
      const saved = repo.save.mock.calls[0][0];
      expect(saved.metadata).toEqual({ trialId: 't-123' });
    });

    it('nulls placeholder values on UUID columns (system/default)', async () => {
      const saved = await service.log({
        entityType: 'capas',
        entityId:   'c-1',
        action:     'PATCH',
        userId:     'system',
        tenantId:   'default',
      });
      expect(saved.userId).toBeNull();
      expect(saved.tenantId).toBeNull();
    });

    it('preserves valid UUIDs on user_id and tenant_id', async () => {
      const saved = await service.log({
        entityType: 'capas',
        entityId:   'c-1',
        action:     'PATCH',
        userId:     '7f9c8e6d-2a4b-4c5d-8e6f-0a1b2c3d4e5f',
        tenantId:   'a1b2c3d4-e5f6-4789-9abc-def012345678',
      });
      expect(saved.userId).toBe('7f9c8e6d-2a4b-4c5d-8e6f-0a1b2c3d4e5f');
      expect(saved.tenantId).toBe('a1b2c3d4-e5f6-4789-9abc-def012345678');
    });
  });

  // ── eventType classification ───────────────────────────────────────────────

  describe('eventType classification', () => {
    it('defaults plain log() calls to CRUD', async () => {
      await service.log({ entityType: 'capas', entityId: 'c-1', action: 'PATCH' });
      const saved = repo.save.mock.calls[0][0];
      expect(saved.eventType).toBe(AuditEventType.CRUD);
    });

    it('logBusinessEvent always writes BUSINESS type', async () => {
      await service.logBusinessEvent('customer.updated', 'Customer', 'c-1', 'u-1', { tenantId: 't' });
      const saved = repo.save.mock.calls[0][0];
      expect(saved.eventType).toBe(AuditEventType.BUSINESS);
    });

    it('honours an explicit eventType override in log()', async () => {
      await service.log({
        entityType: 'users', entityId: 'u-1', action: 'LOGIN',
        eventType: AuditEventType.AUTH,
      });
      const saved = repo.save.mock.calls[0][0];
      expect(saved.eventType).toBe(AuditEventType.AUTH);
    });

    it('passes the transactional EntityManager through to the record write', async () => {
      const em: any = {
        getRepository: jest.fn(() => ({ create: (d: any) => d, save: jest.fn(async (e: any) => e) })),
      };
      const record = await service.log(
        { entityType: 'rfqs', entityId: 'r-1', action: 'TRANSITION' },
        em,
      );
      expect(em.getRepository).toHaveBeenCalledWith(AuditLog);
      expect(record.action).toBe('TRANSITION');
    });
  });

  // ── findByEntity() ─────────────────────────────────────────────────────────

  describe('findByEntity()', () => {
    it('finds records by entityType and entityId', async () => {
      repo.find.mockResolvedValue([{ id: 'log-1' }]);
      const results = await service.findByEntity('projects', 'proj-uuid');
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { entityType: 'projects', entityId: 'proj-uuid' } }),
      );
      expect(results).toHaveLength(1);
    });

    it('orders by createdAt DESC', async () => {
      await service.findByEntity('capas', 'c-1');
      const opts = repo.find.mock.calls[0][0];
      expect(opts.order.createdAt).toBe('DESC');
    });
  });

  // ── findByUser() ───────────────────────────────────────────────────────────

  describe('findByUser()', () => {
    it('finds records by userId', async () => {
      repo.find.mockResolvedValue([{ id: 'log-2' }, { id: 'log-3' }]);
      const results = await service.findByUser('user-uuid');
      expect(results).toHaveLength(2);
    });

    it('defaults to limit 50', async () => {
      await service.findByUser('user-uuid');
      const opts = repo.find.mock.calls[0][0];
      expect(opts.take).toBe(50);
    });

    it('accepts custom limit', async () => {
      await service.findByUser('user-uuid', undefined, 10);
      const opts = repo.find.mock.calls[0][0];
      expect(opts.take).toBe(10);
    });
  });

  // ── findAll() ─────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns paginated result structure', async () => {
      repo._qb.getManyAndCount.mockResolvedValue([[{ id: 'log-1' }], 1]);
      const result = await service.findAll('tenant-uuid', 1, 10);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('applies tenant filter when tenantId provided', async () => {
      await service.findAll('tenant-uuid');
      expect(repo._qb.where).toHaveBeenCalledWith(
        expect.stringContaining('tenant_id'),
        expect.objectContaining({ tenantId: 'tenant-uuid' }),
      );
    });

    it('skips correct number of records for page 2', async () => {
      await service.findAll(undefined, 2, 25);
      expect(repo._qb.skip).toHaveBeenCalledWith(25); // (page-1)*limit = 1*25
    });
  });
});
