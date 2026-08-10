/**
 * Unit tests for AiDomainCopilotService.
 *
 * Deps (KnowledgeContextBuilderService, KnowledgeSearchService,
 * KnowledgeGraphService) are mocked so domain context building and intent
 * mapping are exercised without a real database.
 *
 * Tests verify:
 *  1. buildDomainContext performs a scoped knowledge search with the correct
 *     domain query, expected embedding types and pagination.
 *  2. With an entity reference, entity context + graph are attached; without
 *     one, context is null and graph is [].
 *  3. mapTask honours an explicit requestedTask, then keyword routes per
 *     domain, with deterministic fallbacks.
 */
import { Test } from '@nestjs/testing';
import { AiDomainCopilotService } from './ai-domain-copilot.service';
import { KnowledgeContextBuilderService } from '@modules/knowledge/services/knowledge-context-builder.service';
import { KnowledgeSearchService } from '@modules/knowledge/services/knowledge-search.service';
import { KnowledgeGraphService } from '@modules/knowledge/services/knowledge-graph.service';
import { EmbeddingEntityType } from '../entities/knowledge-embedding.entity';
import { CopilotDomain } from '../dto/copilot.dto';

const TENANT_ID = 'tenant-uuid-0001';
const DOMAIN = CopilotDomain.ENGINEERING;
const QUERY = 'why is that drawing stale?';

const mockSearch = (result: unknown = { data: [], total: 0 }) => ({
  search: jest.fn().mockResolvedValue(result),
});

const mockContextBuilder = (result: unknown = {}) => ({
  buildContext: jest.fn().mockResolvedValue(result),
});

const mockGraph = (result: unknown = []) => ({
  findByEntity: jest.fn().mockResolvedValue(result),
});

async function build(mocks: {
  search?: ReturnType<typeof mockSearch>;
  contextBuilder?: ReturnType<typeof mockContextBuilder>;
  graph?: ReturnType<typeof mockGraph>;
}) {
  const module = await Test.createTestingModule({
    providers: [
      AiDomainCopilotService,
      { provide: KnowledgeContextBuilderService, useValue: mocks.contextBuilder ?? mockContextBuilder() },
      { provide: KnowledgeSearchService, useValue: mocks.search ?? mockSearch() },
      { provide: KnowledgeGraphService, useValue: mocks.graph ?? mockGraph() },
    ],
  }).compile();
  return module.get<AiDomainCopilotService>(AiDomainCopilotService);
}

// ── buildDomainContext: search scoping ─────────────────────────────────────────
describe('AiDomainCopilotService — buildDomainContext', () => {
  it('searches with the composed domain/entity/query string and page 1 limit 8', async () => {
    const search = mockSearch({ data: [{ entityId: 'e1' }], total: 1 });
    const service = await build({ search });

    await service.buildDomainContext(CopilotDomain.QUALITY, 'trial', 'trial-1', TENANT_ID, 'capa review');

    expect(search.search).toHaveBeenCalledWith({
      query: 'quality trial trial-1 capa review',
      tenantId: TENANT_ID,
      types: [EmbeddingEntityType.CAPA, EmbeddingEntityType.TRIAL, EmbeddingEntityType.KNOWLEDGE],
      topK: 8,
      page: 1,
      limit: 8,
    });
  });

  it('scopes search to the domain embedding types for engineering', async () => {
    const search = mockSearch();
    const service = await build({ search });

    await service.buildDomainContext(CopilotDomain.ENGINEERING, undefined, undefined, TENANT_ID, QUERY);

    const options = search.search.mock.calls[0][0];
    expect(options.types).toBeUndefined();
    expect(options.query).toBe(`engineering ${QUERY}`);
  });

  it.each([
    [CopilotDomain.PROJECT, [EmbeddingEntityType.PROJECT, EmbeddingEntityType.KNOWLEDGE]],
    [CopilotDomain.EXECUTIVE, [EmbeddingEntityType.PROJECT, EmbeddingEntityType.KNOWLEDGE]],
    [CopilotDomain.SERVICE, [EmbeddingEntityType.SERVICE, EmbeddingEntityType.KNOWLEDGE]],
    [CopilotDomain.QUALITY, [EmbeddingEntityType.CAPA, EmbeddingEntityType.TRIAL, EmbeddingEntityType.KNOWLEDGE]],
    [CopilotDomain.MANUFACTURING, [EmbeddingEntityType.WORK_ORDER, EmbeddingEntityType.KNOWLEDGE]],
  ])('scopes search types for %s', async (domain, expectedTypes) => {
    const search = mockSearch();
    const service = await build({ search });

    await service.buildDomainContext(domain, 'entity', 'ent-1', TENANT_ID, 'q');

    expect(search.search.mock.calls[0][0].types).toEqual(expectedTypes);
  });

  // ── buildDomainContext (context / graph attachment) ──────────────────────
  it('attaches entity context and graph when entityType + entityId are provided', async () => {
    const context = { entity: 'drawing-1', description: 'BOM for pump' };
    const graph = [{ targetEntityId: 'part-9' }];
    const search = mockSearch({ data: [], total: 0 });
    const contextBuilder = mockContextBuilder(context);
    const graphSvc = mockGraph(graph);
    const service = await build({ search, contextBuilder, graph: graphSvc });

    const result = await service.buildDomainContext(DOMAIN, 'drawing', 'drawing-1', TENANT_ID, QUERY);

    expect(contextBuilder.buildContext).toHaveBeenCalledWith('drawing', 'drawing-1', TENANT_ID);
    expect(graphSvc.findByEntity).toHaveBeenCalledWith(TENANT_ID, 'drawing', 'drawing-1');
    expect(result.context).toBe(context);
    expect(result.graph).toBe(graph);
    expect(result.search.total).toBe(0);
  });

  it('returns context null and empty graph when no entity reference is given', async () => {
    const contextBuilder = mockContextBuilder({ current: 'nope' });
    const graphSvc = mockGraph([{ targetEntityId: 'x' }]);
    const service = await build({ contextBuilder, graph: graphSvc });

    const result = await service.buildDomainContext(DOMAIN, undefined, undefined, TENANT_ID, QUERY);

    expect(contextBuilder.buildContext).not.toHaveBeenCalled();
    expect(graphSvc.findByEntity).not.toHaveBeenCalled();
    expect(result.context).toBeNull();
    expect(result.graph).toEqual([]);
    expect(result.search.total).toBe(0);
  });

  it('treats a partial entity reference (entityType only) as unanchored', async () => {
    const search = mockSearch({ data: [], total: 0 });
    const contextBuilder = mockContextBuilder({ current: 'nope' });
    const graphSvc = mockGraph([{ targetEntityId: 'x' }]);
    const service = await build({ search, contextBuilder, graph: graphSvc });

    const result = await service.buildDomainContext(DOMAIN, 'drawing', undefined, TENANT_ID, QUERY);

    expect(contextBuilder.buildContext).not.toHaveBeenCalled();
    expect(graphSvc.findByEntity).not.toHaveBeenCalled();
    expect(result.context).toBeNull();
    expect(result.graph).toEqual([]);
    expect(result.search.total).toBe(0);
  });
});

// ── mapTask ───────────────────────────────────────────────────────────────────
describe('AiDomainCopilotService — mapTask', () => {
  it('returns the explicit requested task verbatim', () => {
    const service = new AiDomainCopilotService(
      mockContextBuilder() as any,
      mockSearch() as any,
      mockGraph() as any,
    );
    expect(service.mapTask(DOMAIN, 'anything at all', 'engineering.compare_revisions'))
      .toBe('engineering.compare_revisions');
  });

  it.each([
    ['/bom/ BOM exploded', 'engineering.explain_bom'],
    ['Which revision changed?', 'engineering.compare_revisions'],
    ['find similar Drawings to this', 'engineering.find_similar_drawings'],
    ['What is the routing plan?', 'engineering.summarize_process_plans'],
    ['explain this drawing', 'engineering.explain_drawing'],
  ])('routes engineering intent "%s" → %s', (message, expected) => {
    const service = buildRaw();
    expect(service.mapTask(CopilotDomain.ENGINEERING, message)).toBe(expected);
  });

  it.each([
    ['downtime this week', 'manufacturing.downtime_analysis'],
    ['machine utilization rate', 'manufacturing.machine_utilization'],
    ['material variance value', 'manufacturing.material_variance'],
    ['scrap on line 4', 'manufacturing.explain_scrap'],
    ['rework orders today', 'manufacturing.explain_rework'],
    ['cycle time review', 'manufacturing.cycle_time_review'],
    ['shift summary', 'manufacturing.production_summary'],
  ])('routes manufacturing intent "%s" → %s', (message, expected) => {
    const service = buildRaw();
    expect(service.mapTask(CopilotDomain.MANUFACTURING, message)).toBe(expected);
  });

  it.each([
    ['open NCR details', 'quality.ncr_explanation'],
    ['non-conformance root cause', 'quality.ncr_explanation'],
    ['latest CAPA status', 'quality.capa_summary'],
    ['corrective actions list', 'quality.capa_summary'],
    ['help with FMEA', 'quality.fmea_assistance'],
    ['ppap checklist steps', 'quality.ppap_checklist_guidance'],
    ['apqp gate review', 'quality.ppap_checklist_guidance'],
    ['supplier audit summary', 'quality.supplier_quality_summary'],
    ['inspection results', 'quality.inspection_summary'],
  ])('routes quality intent "%s" → %s', (message, expected) => {
    const service = buildRaw();
    expect(service.mapTask(CopilotDomain.QUALITY, message)).toBe(expected);
  });

  it.each([
    ['recommended spare parts', 'service.recommended_spare_parts'],
    ['failure pattern analysis', 'service.failure_pattern_summary'],
    ['recent maintenance history', 'service.maintenance_history'],
    ['customer timeline', 'service.customer_service_timeline'],
    ['warranty status', 'service.warranty_summary'],
  ])('routes service intent "%s" → %s', (message, expected) => {
    const service = buildRaw();
    expect(service.mapTask(CopilotDomain.SERVICE, message)).toBe(expected);
  });

  it.each([
    ['portfolio health', 'executive.project_portfolio_summary'],
    ['revenue overview', 'executive.revenue_overview'],
    ['quality trends', 'executive.quality_trends'],
    ['quality metrics this quarter', 'executive.quality_trends'],
    ['risk exposure', 'executive.risk_summary'],
    ['company pulse', 'executive.company_health_summary'],
  ])('routes executive intent "%s" → %s', (message, expected) => {
    const service = buildRaw();
    expect(service.mapTask(CopilotDomain.EXECUTIVE, message)).toBe(expected);
  });

  it('routes commercial and project domains to their fixed defaults', () => {
    const service = buildRaw();
    expect(service.mapTask(CopilotDomain.COMMERCIAL, 'pipeline status')).toBe('commercial.pipeline_summary');
    expect(service.mapTask(CopilotDomain.PROJECT, 'find similar jobs')).toBe('project.find_similar_projects');
    const unknown = 'unknown' as CopilotDomain;
    expect(service.mapTask(unknown, 'anything')).toBe('default.fallback');
  });
});

// Construct the service directly for pure mapTask tests (deps unused).
function buildRaw(): AiDomainCopilotService {
  return new AiDomainCopilotService(
    mockContextBuilder() as any,
    mockSearch() as any,
    mockGraph() as any,
  );
}