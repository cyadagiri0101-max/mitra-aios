import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ToolRegistryService } from './tool-registry.service';

const makeDeps = (overrides: Record<string, any> = {}) => {
  const paged = (rows: any[]) => ({ data: rows, total: rows.length, page: 1, limit: 10 });
  return {
    config: { get: jest.fn((_k: string, fallback?: any) => fallback) },
    drawings: { findOne: jest.fn(async () => ({ id: 'drawing-1' })), findAllAdvanced: jest.fn(async () => paged([{ id: 'drawing-1' }])) },
    boms: { findOne: jest.fn(async () => ({ id: 'bom-1' })), findAllAdvanced: jest.fn(async () => paged([{ id: 'bom-1' }])) },
    processPlanning: { getRoutingWithOperations: jest.fn(async () => ({ id: 'routing-1' })), findAllAdvanced: jest.fn(async () => paged([{ id: 'routing-1' }])) },
    documents: { findOne: jest.fn(async () => ({ id: 'doc-1' })), findAllAdvanced: jest.fn(async () => paged([{ id: 'doc-1' }])) },
    processPlans: { findOne: jest.fn(async () => ({ id: 'plan-1' })), findAll: jest.fn(async () => paged([{ id: 'plan-1' }])) },
    ncrs: { findOne: jest.fn(async () => ({ id: 'ncr-1' })), findAll: jest.fn(async () => paged([{ id: 'ncr-1' }])) },
    capas: { findOne: jest.fn(async () => ({ id: 'capa-1' })), findAll: jest.fn(async () => paged([{ id: 'capa-1' }])) },
    workOrders: { findOne: jest.fn(async () => ({ id: 'wo-1' })), findAll: jest.fn(async () => paged([{ id: 'wo-1' }])) },
    serviceRequests: { findOne: jest.fn(async () => ({ id: 'sr-1' })), findAll: jest.fn(async () => paged([{ id: 'sr-1' }])) },
    rfqs: { findOneWithDetails: jest.fn(async () => ({ id: 'rfq-1' })), findAllFiltered: jest.fn(async () => paged([{ id: 'rfq-1' }])) },
    quotations: { findOneWithItems: jest.fn(async () => ({ id: 'quot-1' })), findAllFiltered: jest.fn(async () => paged([{ id: 'quot-1' }])) },
    projects: { findOne: jest.fn(async () => ({ id: 'proj-1' })), findAll: jest.fn(async () => paged([{ id: 'proj-1' }])) },
    dashboards: { getExecutiveDashboard: jest.fn(async () => ({ projects: 5 })) },
    kpis: { getKpis: jest.fn(async () => ({ kpi: 'ok' })) },
    knowledgeSearch: { search: jest.fn(async () => ({ data: [{ title: 'kb' }] })) },
    ...overrides,
  };
};

const buildRegistry = (deps?: ReturnType<typeof makeDeps>) => {
  const d = deps ?? makeDeps();
  const registry = new ToolRegistryService(
    d.config as any, d.drawings as any, d.boms as any, d.processPlanning as any,
    d.documents as any, d.processPlans as any, d.ncrs as any, d.capas as any,
    d.workOrders as any, d.serviceRequests as any, d.rfqs as any, d.quotations as any,
    d.projects as any, d.dashboards as any, d.kpis as any, d.knowledgeSearch as any,
  );
  registry.onModuleInit();
  return { registry, deps: d };
};

const ctx = { tenantId: 'tenant-1', userId: 'user-1', userRole: 'ADMIN' };

describe('ToolRegistryService', () => {
  it('registers all 14 domain tools', () => {
    const { registry } = buildRegistry();
    expect(registry.listTools()).toHaveLength(14);
  });

  it('lists tools filtered by domain', () => {
    const { registry } = buildRegistry();
    const quality = registry.listTools('quality');
    expect(quality.map((tool) => tool.name)).toEqual(['quality.capas', 'quality.ncrs']);
  });

  it('executes a list tool through the exported domain service', async () => {
    const { registry, deps } = buildRegistry();
    const result = await registry.execute('manufacturing.work_orders', { page: 1, limit: 5 }, ctx);
    expect(result.tool).toBe('manufacturing.work_orders');
    expect(result.truncated).toBe(false);
    expect((result.result as any).data[0].id).toBe('wo-1');
    expect(deps.workOrders.findAll).toHaveBeenCalledWith('tenant-1', 1, 5);
  });

  it('executes a single-record tool when id is supplied', async () => {
    const { registry, deps } = buildRegistry();
    const result = await registry.execute('engineering.drawings', { id: 'drawing-1' }, ctx);
    expect((result.result as any).id).toBe('drawing-1');
    expect(deps.drawings.findOne).toHaveBeenCalledWith('drawing-1', 'tenant-1');
    expect(deps.drawings.findAllAdvanced).not.toHaveBeenCalled();
  });

  it('enforces role-based access per tool', async () => {
    const { registry } = buildRegistry();
    await expect(registry.execute('analytics.bi_query', {}, { ...ctx, userRole: 'QUALITY' }))
      .rejects.toThrow(ForbiddenException);
    await expect(registry.execute('quality.ncrs', {}, { ...ctx, userRole: 'SALES' }))
      .rejects.toThrow(ForbiddenException);
  });

  it('allows executive BI only for ADMIN/MANAGEMENT and returns dashboard+KPIs', async () => {
    const { registry, deps } = buildRegistry();
    const result = await registry.execute('analytics.bi_query', { period: '7d' }, { ...ctx, userRole: 'MANAGEMENT' });
    expect((result.result as any).dashboard.projects).toBe(5);
    expect(deps.kpis.getKpis).toHaveBeenCalledWith('tenant-1', '7d');
  });

  it('throws NotFoundException for unknown tools', async () => {
    const { registry } = buildRegistry();
    await expect(registry.execute('does.not.exist', {}, ctx)).rejects.toThrow(NotFoundException);
  });

  it('truncates oversized list results and reports original count', async () => {
    const bigRows = Array.from({ length: 200 }, (_, i) => ({ id: `row-${i}`, padding: 'x'.repeat(200) }));
    const deps = makeDeps({
      projects: { findOne: jest.fn(), findAll: jest.fn(async () => ({ data: bigRows, total: 200, page: 1, limit: 200 })) },
    });
    const { registry } = buildRegistry(deps);
    const result = await registry.execute('project.projects', {}, ctx);
    expect(result.truncated).toBe(true);
    expect((result.result as any).originalCount).toBe(200);
    expect((result.result as any).data.length).toBeLessThan(200);
    expect(JSON.stringify(result.result).length).toBeLessThanOrEqual(8192 + 512);
  });

  it('runs knowledge search with tenant scope', async () => {
    const { registry, deps } = buildRegistry();
    const result = await registry.execute('knowledge.search', { query: 'ncr procedure' }, ctx);
    expect((result.result as any).data[0].title).toBe('kb');
    expect(deps.knowledgeSearch.search).toHaveBeenCalledWith(expect.objectContaining({
      query: 'ncr procedure',
      tenantId: 'tenant-1',
    }));
  });
});
