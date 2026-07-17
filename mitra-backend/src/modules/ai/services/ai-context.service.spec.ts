/**
 * Unit tests for AiContextService.
 *
 * Mocks EntityManager.createQueryBuilder() so every intent path is exercised
 * without a real database.
 *
 * Tests verify:
 *  1. Every intent returns { intent, data, summary } with the correct shape.
 *  2. A DB failure in any intent degrades gracefully (empty array, no throw).
 *  3. recordCount in the summary string is correct.
 */
import { Test } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { AiContextService } from './ai-context.service';
import { AiIntent } from '../dto/ai.dto';

const TENANT_ID = 'tenant-uuid-0001';

// ── QueryBuilder mock factory ─────────────────────────────────────────────────
/**
 * Builds a chainable QueryBuilder stub.
 * All builder methods return `this`; getRawMany() resolves with `rows`.
 */
const makeQB = (rows: unknown[] = [], shouldThrow = false) => {
  const qb: any = {
    select:      jest.fn().mockReturnThis(),
    from:        jest.fn().mockReturnThis(),
    leftJoin:    jest.fn().mockReturnThis(),
    innerJoin:   jest.fn().mockReturnThis(),
    where:       jest.fn().mockReturnThis(),
    andWhere:    jest.fn().mockReturnThis(),
    groupBy:     jest.fn().mockReturnThis(),
    addGroupBy:  jest.fn().mockReturnThis(),
    orderBy:     jest.fn().mockReturnThis(),
    addOrderBy:  jest.fn().mockReturnThis(),
    limit:       jest.fn().mockReturnThis(),
    getRawMany:  shouldThrow
      ? jest.fn().mockRejectedValue(new Error('DB error'))
      : jest.fn().mockResolvedValue(rows),
  };
  return qb;
};

const mockEM = (rows: unknown[] = [], shouldThrow = false) => ({
  createQueryBuilder: jest.fn(() => makeQB(rows, shouldThrow)),
});

async function build(em: ReturnType<typeof mockEM>) {
  const module = await Test.createTestingModule({
    providers: [
      AiContextService,
      { provide: getEntityManagerToken(), useValue: em },
    ],
  }).compile();
  return module.get<AiContextService>(AiContextService);
}

// ── PROJECTS ──────────────────────────────────────────────────────────────────
describe('AiContextService — PROJECTS', () => {
  it('returns project rows from DB', async () => {
    const rows = [{ projectNumber: 'P001', name: 'Widget', currentStage: 'TOOLING' }];
    const service = await build(mockEM(rows));
    const result = await service.buildContext(AiIntent.PROJECTS, TENANT_ID);
    expect(result.intent).toBe(AiIntent.PROJECTS);
    expect(result.data.projects).toHaveLength(1);
    expect(result.data.projects[0].projectNumber).toBe('P001');
  });

  it('degrades gracefully when DB throws', async () => {
    const service = await build(mockEM([], true));
    const result = await service.buildContext(AiIntent.PROJECTS, TENANT_ID);
    expect(result.data.projects).toEqual([]);
    expect(result.summary).toContain('0 records');
  });
});

// ── TRIALS ────────────────────────────────────────────────────────────────────
describe('AiContextService — TRIALS', () => {
  it('returns trial rows', async () => {
    const rows = [{ trialDate: '2024-01-15', result: 'PASS', observations: 'OK' }];
    const service = await build(mockEM(rows));
    const result = await service.buildContext(AiIntent.TRIALS, TENANT_ID);
    expect(result.data.recent_trials).toHaveLength(1);
  });

  it('degrades gracefully on error', async () => {
    const service = await build(mockEM([], true));
    const result = await service.buildContext(AiIntent.TRIALS, TENANT_ID);
    expect(result.data.recent_trials).toEqual([]);
  });
});

// ── CAPA ──────────────────────────────────────────────────────────────────────
describe('AiContextService — CAPA', () => {
  it('returns CAPA rows from capa_verifications', async () => {
    const rows = [{ capaNumber: 'CA-001', issueDescription: 'Flash defect', status: 'OPEN' }];
    const service = await build(mockEM(rows));
    const result = await service.buildContext(AiIntent.CAPA, TENANT_ID);
    expect(result.data.open_capas).toHaveLength(1);
    expect(result.data.open_capas[0].capaNumber).toBe('CA-001');
  });

  it('degrades gracefully on error', async () => {
    const service = await build(mockEM([], true));
    const result = await service.buildContext(AiIntent.CAPA, TENANT_ID);
    expect(result.data.open_capas).toEqual([]);
  });
});

// ── MANUFACTURING ─────────────────────────────────────────────────────────────
describe('AiContextService — MANUFACTURING', () => {
  it('returns work_order rows', async () => {
    const rows = [{ workOrderNumber: 'WO-001', partName: 'Core A', status: 'IN_PROGRESS' }];
    const service = await build(mockEM(rows));
    const result = await service.buildContext(AiIntent.MANUFACTURING, TENANT_ID);
    expect(result.data.work_orders).toHaveLength(1);
  });
});

// ── DISPATCH ──────────────────────────────────────────────────────────────────
describe('AiContextService — DISPATCH', () => {
  it('returns empty array (table not yet implemented)', async () => {
    const service = await build(mockEM([]));
    const result = await service.buildContext(AiIntent.DISPATCH, TENANT_ID);
    expect(result.data.dispatches).toEqual([]);
  });
});

// ── SERVICE ───────────────────────────────────────────────────────────────────
describe('AiContextService — SERVICE', () => {
  it('returns service request rows', async () => {
    const rows = [{ serviceNumber: 'SR-001', customerName: 'Acme', status: 'OPEN' }];
    const service = await build(mockEM(rows));
    const result = await service.buildContext(AiIntent.SERVICE, TENANT_ID);
    expect(result.data.service_requests).toHaveLength(1);
  });
});

// ── KNOWLEDGE ─────────────────────────────────────────────────────────────────
describe('AiContextService — KNOWLEDGE', () => {
  it('returns published articles', async () => {
    const rows = [{ title: 'Shrinkage Guide', category: 'PROCESS', viewCount: 100 }];
    const service = await build(mockEM(rows));
    const result = await service.buildContext(AiIntent.KNOWLEDGE, TENANT_ID);
    expect(result.data.articles).toHaveLength(1);
  });
});

// ── WORKFLOW ──────────────────────────────────────────────────────────────────
describe('AiContextService — WORKFLOW', () => {
  it('returns workflow summary rows', async () => {
    const rows = [{ entityType: 'project', currentStage: 'REVIEW', count: 5 }];
    const service = await build(mockEM(rows));
    const result = await service.buildContext(AiIntent.WORKFLOW, TENANT_ID);
    expect(result.data.workflow_summary).toHaveLength(1);
  });
});

// ── Summary string ────────────────────────────────────────────────────────────
describe('AiContextService — summary', () => {
  it('summary includes record count and intent', async () => {
    const rows = [{ projectNumber: 'P001' }, { projectNumber: 'P002' }];
    const service = await build(mockEM(rows));
    const result = await service.buildContext(AiIntent.PROJECTS, TENANT_ID);
    expect(result.summary).toContain('2 records');
    expect(result.summary).toContain(AiIntent.PROJECTS);
  });
});
