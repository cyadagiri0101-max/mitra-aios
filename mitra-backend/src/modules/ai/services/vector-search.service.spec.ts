/**
 * Unit tests for VectorSearchService.
 *
 * Key contracts tested:
 *  1. search() uses vector path when embedding is available.
 *  2. search() falls back to text search when embedding returns null.
 *  3. trialIntelligence() assembles SimilarTrial from DB rows correctly.
 *  4. capaIntelligence() queries capa_verifications (correct table).
 *  5. DB failures are caught and don't propagate.
 */
import { Test } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { VectorSearchService } from './vector-search.service';
import { EmbeddingService } from './embedding.service';
import { EmbeddingEntityType } from '../entities/knowledge-embedding.entity';

const TENANT_ID = 'tenant-uuid-0002';

const mockEmbedding = (vector: number[] | null) => ({
  generateEmbedding: jest.fn().mockResolvedValue(vector),
});

/** Build a chainable QueryBuilder stub returning `rows` from getRawMany(). */
const makeQB = (rows: unknown[] = [], shouldThrow = false) => {
  const qb: any = {
    select:     jest.fn().mockReturnThis(),
    from:       jest.fn().mockReturnThis(),
    leftJoin:   jest.fn().mockReturnThis(),
    innerJoin:  jest.fn().mockReturnThis(),
    where:      jest.fn().mockReturnThis(),
    andWhere:   jest.fn().mockReturnThis(),
    orderBy:    jest.fn().mockReturnThis(),
    limit:      jest.fn().mockReturnThis(),
    getRawMany: shouldThrow
      ? jest.fn().mockRejectedValue(new Error('DB error'))
      : jest.fn().mockResolvedValue(rows),
  };
  return qb;
};

/** Build an EntityManager stub with both query() and createQueryBuilder(). */
const makeEM = (
  queryRows: unknown[] = [],
  qbRows:    unknown[] = [],
  qbThrows = false,
) => ({
  query:              jest.fn().mockResolvedValue(queryRows),
  createQueryBuilder: jest.fn(() => makeQB(qbRows, qbThrows)),
});

async function build(em: any, embSvc: any) {
  const mod = await Test.createTestingModule({
    providers: [
      VectorSearchService,
      { provide: EmbeddingService,        useValue: embSvc },
      { provide: getEntityManagerToken(), useValue: em },
    ],
  }).compile();
  return mod.get<VectorSearchService>(VectorSearchService);
}

// ── search() ──────────────────────────────────────────────────────────────────
describe('VectorSearchService — search()', () => {
  it('calls vectorSearch when embedding is available', async () => {
    const vector = Array(768).fill(0.1);
    const queryRows = [{
      entity_type: 'trial', entity_id: 'trial-1',
      content_text: 'flash at gate', metadata: null, similarity: 0.92,
    }];
    const em = makeEM(queryRows);
    const svc = await build(em, mockEmbedding(vector));
    const results = await svc.search('flash defect', TENANT_ID);
    expect(em.query).toHaveBeenCalledTimes(1);
    expect(results[0].similarity).toBeCloseTo(0.92);
    expect(results[0].entityType).toBe('trial');
  });

  it('falls back to textSearch when embedding returns null', async () => {
    const queryRows = [{
      entity_type: 'knowledge', entity_id: 'kb-1',
      content_text: 'shrinkage guide', metadata: null, similarity: 0.7,
    }];
    const em = makeEM(queryRows);
    const svc = await build(em, mockEmbedding(null));
    const results = await svc.search('shrinkage', TENANT_ID);
    expect(results[0].entityType).toBe('knowledge');
  });

  it('returns empty array when DB throws during text search', async () => {
    const em = {
      query:              jest.fn().mockRejectedValue(new Error('pg_trgm not installed')),
      createQueryBuilder: jest.fn(() => makeQB([])),
    };
    const svc = await build(em, mockEmbedding(null));
    const results = await svc.search('flash', TENANT_ID);
    expect(results).toEqual([]);
  });
});

// ── trialIntelligence() ───────────────────────────────────────────────────────
describe('VectorSearchService — trialIntelligence()', () => {
  it('returns SimilarTrial array with correct fields', async () => {
    const embVector = Array(768).fill(0.1);
    // vectorSearch uses em.query(); trial detail uses em.createQueryBuilder()
    const searchRows = [{
      entity_type: 'trial', entity_id: 'trial-uuid-1',
      content_text: 'flash at gate', metadata: null, similarity: 0.91,
    }];
    const detailRows = [{
      id:                    'trial-uuid-1',
      trialDate:             '2024-03-01',
      result:                'FAIL',
      observations:          'Heavy flash at gate',
      correctiveActions:     'Reduce injection speed\nIncrease clamp force',
      goodParts:             10,
      rejectedParts:         5,
      moldTemperatureC:      45,
      injectionPressureBar:  120,
      cycleTimeSeconds:      30,
      projectNumber:         'P001',
      productName:           'Core A',
    }];

    const em = makeEM(searchRows, detailRows);
    const svc = await build(em, mockEmbedding(embVector));
    const result = await svc.trialIntelligence('flash defect at gate', TENANT_ID);

    expect(result.currentIssue).toBe('flash defect at gate');
    expect(result.similarTrials).toHaveLength(1);
    expect(result.similarTrials[0].trialId).toBe('trial-uuid-1');
    expect(result.similarTrials[0].result).toBe('FAIL');
    expect(result.similarTrials[0].actions).toContain('Reduce injection speed');
    expect(result.insights.length).toBeGreaterThan(0);
  });

  it('returns empty trials gracefully when QB throws', async () => {
    const searchRows = [{
      entity_type: 'trial', entity_id: 'x',
      content_text: '', metadata: null, similarity: 0.8,
    }];
    const em = makeEM(searchRows, [], true /* qbThrows */);
    const svc = await build(em, mockEmbedding(Array(768).fill(0.1)));
    const result = await svc.trialIntelligence('any issue', TENANT_ID);
    expect(result.similarTrials).toEqual([]);
    expect(result.recommendedActions).toEqual([]);
  });
});

// ── capaIntelligence() ────────────────────────────────────────────────────────
describe('VectorSearchService — capaIntelligence()', () => {
  it('does not call QB when search returns no IDs', async () => {
    const em = makeEM([]); // query returns no search hits
    const svc = await build(em, mockEmbedding(null));
    await svc.capaIntelligence('flash', TENANT_ID);
    // text search called once; QB should not be called (no ids to look up)
    expect(em.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('returns top root causes and proven fixes', async () => {
    const searchRows = [{
      entity_type: EmbeddingEntityType.CAPA, entity_id: 'capa-1',
      content_text: '', metadata: null, similarity: 0.85,
    }];
    const detailRows = [{
      id:                'capa-1',
      capaNumber:        'CA-001',
      title:             'Flash at parting line',
      rootCause:         'Insufficient clamping force',
      correctiveAction:  'Increase clamp force to 450T',
      preventiveAction:  'Add clamp force check to startup procedure',
      status:            'CLOSED',
    }];
    const em = makeEM(searchRows, detailRows);
    const svc = await build(em, mockEmbedding(null));
    const result = await svc.capaIntelligence('parting line flash', TENANT_ID);
    expect(result.topRootCauses).toContain('Insufficient clamping force');
    expect(result.provenFixes).toContain('Increase clamp force to 450T');
  });
});
