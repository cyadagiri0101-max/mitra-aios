import { describe, it, expect } from 'vitest';
import {
  buildWorkflowStages,
  summarizeDashboard,
  mapTrends,
  mapOutboxEvents,
  humanizeEventType,
  formatINR,
  PROJECT_STAGE_ORDER,
  PROJECT_STAGE_LABELS,
  DASHBOARD_DRILLDOWN_ROUTES,
} from './dashboardMapping';
import { APP_ROUTE_PATHS } from './routeManifest';

describe('buildWorkflowStages', () => {
  it('derives stage counts from the authoritative byStage payload', () => {
    const stages = buildWorkflowStages({ ENQUIRY: 3, MANUFACTURING: 5, DISPATCH: 2 });
    expect(stages).toEqual([
      { code: 'ENQUIRY', label: 'Enquiry', count: 3 },
      { code: 'MANUFACTURING', label: 'Manufacturing', count: 5 },
      { code: 'DISPATCH', label: 'Dispatch', count: 2 },
    ]);
  });

  it('keeps canonical lifecycle order regardless of payload ordering', () => {
    const stages = buildWorkflowStages({ DISPATCH: 1, ENQUIRY: 2 });
    expect(stages.map((s) => s.code)).toEqual(['ENQUIRY', 'DISPATCH']);
  });

  it('never invents counts for stages absent from the payload', () => {
    const stages = buildWorkflowStages({ ENQUIRY: 4 });
    expect(stages).toHaveLength(1);
    expect(stages[0].count).toBe(4);
  });

  it('ignores unknown stage codes', () => {
    const stages = buildWorkflowStages({ NOT_A_STAGE: 9, ENQUIRY: 1 });
    expect(stages).toEqual([{ code: 'ENQUIRY', label: 'Enquiry', count: 1 }]);
  });

  it('returns an empty list when no byStage payload exists', () => {
    expect(buildWorkflowStages(undefined)).toEqual([]);
    expect(buildWorkflowStages(null)).toEqual([]);
  });

  it('covers every ProjectStage enum code with a display label', () => {
    for (const code of PROJECT_STAGE_ORDER) {
      expect(PROJECT_STAGE_LABELS[code]).toBeTruthy();
    }
  });
});

describe('summarizeDashboard', () => {
  const dashboard = {
    activeProjects: { total: 10, active: 6, dispatched: 2, inService: 1 },
    quotationValue: { value: 2500000 },
    qualityPerformance: {
      openNcrs: 3,
      capaOpenCount: 4,
      inspectionPassRate: { passRatePct: 92.5 },
    },
    serviceStatus: { closureRatePct: 75 },
  };

  it('extracts certifiable KPI values from the authoritative payload', () => {
    expect(summarizeDashboard(dashboard)).toEqual({
      totalProjects: 10,
      activeProjects: 6,
      inDispatch: 2,
      openCapas: 4,
      openNcrs: 3,
      quotationValue: 2500000,
      closureRatePct: 75,
      passRatePct: 92.5,
    });
  });

  it('returns null (not fabricated zeros) when the dashboard payload is absent', () => {
    expect(summarizeDashboard(undefined)).toBeNull();
    expect(summarizeDashboard(null)).toBeNull();
    expect(summarizeDashboard('oops')).toBeNull();
  });

  it('never surfaces fabricated machine/throughput metrics', () => {
    const summary = summarizeDashboard(dashboard);
    const json = JSON.stringify(summary);
    expect(json).not.toContain('machines');
    expect(json).not.toContain('uptime');
    expect(json).not.toContain('throughput');
    expect(json).not.toContain('oee');
  });
});

describe('mapTrends', () => {
  it('passes through the /analytics/trends contract untouched', () => {
    const data = {
      projectTrends: [
        { month: '2026-01', value: 3 },
        { month: '2026-02', value: 5 },
      ],
      qualityTrends: [
        { month: '2026-01', ncrs: 2, capas: 1 },
      ],
    };
    expect(mapTrends(data)).toEqual(data);
  });

  it('returns empty arrays (empty state) instead of fabricated series', () => {
    expect(mapTrends(undefined)).toEqual({ projectTrends: [], qualityTrends: [] });
    expect(mapTrends({})).toEqual({ projectTrends: [], qualityTrends: [] });
  });
});

describe('outbox activity mapping', () => {
  it('maps authoritative outbox snapshots to display events', () => {
    const events = mapOutboxEvents([{ eventType: 'PROJECT_CREATED', count: 7 }]);
    expect(events).toEqual([{ eventType: 'PROJECT_CREATED', count: 7 }]);
    expect(humanizeEventType('PROJECT_CREATED')).toBe('Project Created');
  });

  it('returns no events when there is no snapshot', () => {
    expect(mapOutboxEvents(undefined)).toEqual([]);
    expect(mapOutboxEvents(null)).toEqual([]);
  });
});

describe('formatINR', () => {
  it('formats quotation value as INR without decimals', () => {
    expect(formatINR(2500000)).toContain('25,00,000');
  });
});

describe('dashboard drill-down routes', () => {
  it('every drill-down target is a registered application route', () => {
    for (const target of DASHBOARD_DRILLDOWN_ROUTES) {
      expect(target).toMatch(/^\//);
      expect(target).not.toContain('?');
      expect(target).not.toContain('#');
      expect(APP_ROUTE_PATHS).toContain(target);
    }
  });

  it('drill-down targets are static (no unresolved params) and unique', () => {
    expect(DASHBOARD_DRILLDOWN_ROUTES.length).toBeGreaterThanOrEqual(5);
    expect(new Set(DASHBOARD_DRILLDOWN_ROUTES).size).toBe(DASHBOARD_DRILLDOWN_ROUTES.length);
    for (const target of DASHBOARD_DRILLDOWN_ROUTES) {
      expect(target).not.toContain(':');
    }
  });

  it('every KPI surface maps to at least one drill-down destination', () => {
    expect(DASHBOARD_DRILLDOWN_ROUTES).toEqual(
      expect.arrayContaining(['/projects', '/dispatch', '/capa', '/quotations', '/quality']),
    );
  });
});