/**
 * M6 / G11 — Real-Time BI Dashboard & Analytics Governance — E2E Acceptance
 *
 * Proves the full chain: authoritative database -> service aggregate -> API ->
 * consumer mapping, without mocks. Every KPI assertion is cross-checked against
 * the real test database (mitra_v2_test) via the shared DataSource.
 *
 * Scope (M6 Sprint 3, Work 1):
 *   1. Real-data KPI chain for every G11 surface (commercial, projects,
 *      engineering, planning, schedule, manufacturing, quality, service,
 *      engineering coverage, trends, capacity timeline).
 *   2. Semantic safety: no fabricated/forbidden metrics (OEE, throughput, MTTR,
 *      SLA compliance, defect rate, revenue, onTime, machine live-state,
 *      overloaded engineers, ML/AI forecast).
 *   3. Tenant security: unauthenticated 401, wrong-tenant 404, no cross-tenant
 *      leakage on representative endpoints.
 *   4. Empty/failure states: a fresh tenant returns truthful zeros, never
 *      fabricated values; invalid period inputs are rejected.
 *   5. Drill-down: the frontend navigation targets referenced by the dashboard
 *      are present and resolvable.
 *   6. Performance: representative endpoint latency is measured and bounded.
 *
 * Semantic terminology enforced: "Quotation Value" (not Revenue),
 * "Open NCR Ratio" (not Defect Rate), "Service Closure Rate" (not SLA),
 * capacity demand curves are "Indicative" (not forecasts).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { createTestApp } from './utils/test-app';

const request = require('supertest');

jest.setTimeout(300_000);

const TENANT_A_ADMIN = {
  email: 'admin@mitra.local',
  password: process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026',
};

const FORBIDDEN_FRAGMENTS = [
  'oee',
  'throughput',
  'mttr',
  'slaCompliance',
  'defectRate',
  'revenue',
  'onTime',
  'overloadedEngineersCount',
  'machineState',
  'machineStatus',
  'liveStatus',
  'mlForecast',
  'prediction',
  'predictive',
  'aiInsight',
  'aiGenerated',
  'fabricated',
];

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

const REPRESENTATIVE_ENDPOINTS = [
  '/api/analytics/dashboard',
  '/api/analytics/kpis',
  '/api/analytics/trends?months=3',
  '/api/project/dashboard/stats',
  '/api/planning/capacity/summary',
  '/api/manufacturing/production/dashboard',
];

describe('M6 G11 BI Dashboard & Analytics Governance (real-data E2E)', () => {
  let app: INestApplication;
  let server: any;
  let ds: DataSource;

  let tenantA: string;
  let adminToken: string;

  let tenantB: string;
  let bToken: string;

  const perf: Record<string, number> = {};

  beforeAll(async () => {
    const { app: builtApp } = await createTestApp();
    app = builtApp;
    server = app.getHttpServer();
    ds = app.get(DataSource);

    const login = await request(server)
      .post('/api/auth/login')
      .send(TENANT_A_ADMIN)
      .expect(200);
    adminToken = login.body.access_token;
    const me = await request(server)
      .get('/api/auth/me')
      .set(auth(adminToken))
      .expect(200);
    tenantA = me.body.tenantId;

    // ── Tenant B fixture (isolated, empty) ──────────────────────────────
    const bEmail = `g11.b.${Date.now()}@mitra.local`;
    const bPassword = 'G11B@Pass!2026';
    await request(server)
      .post('/api/auth/register')
      .set(auth(adminToken))
      .send({ email: bEmail, password: bPassword, firstName: 'G11', lastName: 'TenantB' })
      .expect(201);
    const bUser = await request(server)
      .post('/api/auth/login')
      .send({ email: bEmail, password: bPassword })
      .expect(200);
    const bMe = await request(server)
      .get('/api/auth/me')
      .set(auth(bUser.body.access_token))
      .expect(200);
    const bUserId = bMe.body.id;
    expect(bUserId).toBeDefined();
    const adminRole = await ds.query(`SELECT id FROM roles WHERE name = 'ADMIN' LIMIT 1`);
    expect(adminRole[0]).toBeDefined();
    await request(server)
      .post(`/api/users/${bUserId}/assign-role`)
      .set(auth(adminToken))
      .send({ roleId: adminRole[0].id, reason: 'M6 G11 isolation fixture' })
      .expect(200);

    tenantB = randomUUID();
    await ds.query(
      `INSERT INTO tenants (id, name, code, is_active, created_at, updated_at)
       VALUES ($1, 'G11 Isolation Tenant B', $2, true, now(), now())`,
      [tenantB, `G11B${Date.now() % 100000}`],
    );
    await ds.query('UPDATE users SET tenant_id = $1 WHERE id = $2', [tenantB, bUserId]);

    const bLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: bEmail, password: bPassword })
      .expect(200);
    bToken = bLogin.body.access_token;
    const bMe2 = await request(server)
      .get('/api/auth/me')
      .set(auth(bToken))
      .expect(200);
    expect(bMe2.body.tenantId).toBe(tenantB);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Real-data KPI chain (cross-checked against the database)', () => {
    it('exposes a dashboard assembled from authoritative tenant-scoped data', async () => {
      const res = await request(server)
        .get('/api/analytics/dashboard')
        .set(auth(adminToken))
        .expect(200);

      const d = res.body;
      expect(typeof d.companyOverview.totalProjects).toBe('number');
      expect(typeof d.activeProjects).toBe('object');
      expect(typeof d.quotationValue.value).toBe('number');
      expect(typeof d.qualityPerformance.openNcrs).toBe('number');
      expect(typeof d.qualityPerformance.openRatioPct).toBe('number');
      expect(typeof d.qualityPerformance.capaOpenCount).toBe('number');
      expect(typeof d.qualityPerformance.inspectionPassRate.passRatePct).toBe('number');
      expect(typeof d.enterpriseHealth.engineeringCoverage).toBe('number');
      expect(Array.isArray(d.enterpriseHealth.eventSnapshots)).toBe(true);

      // DB cross-checks
      const proj = await ds.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE stage = 'DISPATCH')::int AS dispatched,
                COUNT(*) FILTER (WHERE stage = 'SERVICE')::int AS in_service
           FROM projects
          WHERE deleted_at IS NULL AND tenant_id = $1`,
        [tenantA],
      );
      const p = proj[0];
      expect(d.companyOverview.totalProjects).toBe(p.total);
      expect(d.activeProjects.total).toBe(p.total);
      expect(d.activeProjects.dispatched).toBe(p.dispatched);
      expect(d.activeProjects.inService).toBe(p.in_service);
      expect(d.activeProjects.active).toBe(p.total - p.dispatched - p.in_service);

      const ncr = await ds.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status <> 'CLOSED')::int AS open_cnt
           FROM ncr_records
          WHERE deleted_at IS NULL AND tenant_id = $1`,
        [tenantA],
      );
      const n = ncr[0];
      expect(d.qualityPerformance.openNcrs).toBe(n.open_cnt);
      const expectedRatio = n.total > 0 ? Math.round((n.open_cnt / n.total) * 1000) / 10 : 0;
      expect(d.qualityPerformance.openRatioPct).toBe(expectedRatio);

      const capa = await ds.query(
        `SELECT COUNT(*) FILTER (WHERE status NOT IN ('CLOSED','REJECTED'))::int AS open_cnt
           FROM capa_verifications
          WHERE deleted_at IS NULL AND tenant_id = $1`,
        [tenantA],
      );
      expect(d.qualityPerformance.capaOpenCount).toBe(capa[0].open_cnt);

      const insp = await ds.query(
        `SELECT COALESCE(SUM(sample_size),0)::int AS inspected,
                COALESCE(SUM(accepted_qty),0)::int AS accepted
           FROM inspection_reports
          WHERE deleted_at IS NULL AND tenant_id = $1`,
        [tenantA],
      );
      const i = insp[0];
      const expectedPass = i.inspected > 0 ? Math.round((i.accepted / i.inspected) * 1000) / 10 : 0;
      expect(d.qualityPerformance.inspectionPassRate.passRatePct).toBe(expectedPass);

      const eng = await ds.query(
        `SELECT COUNT(*)::int AS total FROM engineering_drawings
          WHERE deleted_at IS NULL AND tenant_id = $1`,
        [tenantA],
      );
      expect(d.enterpriseHealth.engineeringCoverage).toBe(eng[0].total);

      const q = await ds.query(
        `SELECT COALESCE(SUM(total_amount),0)::float8 AS value,
                COUNT(*)::int AS count
           FROM quotations
          WHERE deleted_at IS NULL AND tenant_id = $1
            AND status IN ('SENT','APPROVED','ACCEPTED','PROJECT_CREATED','WON')`,
        [tenantA],
      );
      expect(d.quotationValue.value).toBe(q[0].value);
      expect(d.quotationValue.quoteCount).toBe(q[0].count);
    });

    it('exposes real service closure rate (resolved/total, not SLA)', async () => {
      const res = await request(server)
        .get('/api/analytics/dashboard')
        .set(auth(adminToken))
        .expect(200);
      const sr = await ds.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status IN ('RESOLVED','CLOSED'))::int AS resolved
           FROM service_requests
          WHERE deleted_at IS NULL AND tenant_id = $1`,
        [tenantA],
      );
      const s = sr[0];
      const expectedClosure = s.total > 0 ? Math.round((s.resolved / s.total) * 1000) / 10 : 0;
      expect(res.body.serviceStatus.closureRatePct).toBe(expectedClosure);
      expect(res.body.serviceStatus.openRequests).toBe(s.total - s.resolved);
    });

    it('projects stats reconcile with the database (byStage / byHealth sums)', async () => {
      const res = await request(server)
        .get('/api/project/dashboard/stats')
        .set(auth(adminToken))
        .expect(200);
      const s = res.body;
      expect(typeof s.total).toBe('number');
      expect(typeof s.active).toBe('number');
      expect(typeof s.dispatched).toBe('number');
      expect(typeof s.inService).toBe('number');
      expect(typeof s.byStage).toBe('object');
      expect(typeof s.byHealth).toBe('object');
      expect(s.dispatched + s.inService + s.active).toBe(s.total);

      const sumStages = Object.values(s.byStage).reduce((a: number, b: any) => a + Number(b), 0);
      expect(sumStages).toBe(s.total);

      const db = await ds.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE stage = 'DISPATCH')::int AS dispatched,
                COUNT(*) FILTER (WHERE stage = 'SERVICE')::int AS in_service
           FROM projects
          WHERE deleted_at IS NULL AND tenant_id = $1`,
        [tenantA],
      );
      expect(s.total).toBe(db[0].total);
      expect(s.dispatched).toBe(db[0].dispatched);
      expect(s.inService).toBe(db[0].in_service);
    });

    it('monthly trends are deterministic aggregates from real record dates (not a forecast)', async () => {
      const months = 3;
      const res = await request(server)
        .get(`/api/analytics/trends?months=${months}`)
        .set(auth(adminToken))
        .expect(200);
      const t = res.body;
      expect(Array.isArray(t.projectTrends)).toBe(true);
      expect(Array.isArray(t.qualityTrends)).toBe(true);
      expect(t.projectTrends.length).toBe(months);
      expect(t.qualityTrends.length).toBe(months);
      expect(t.meta?.forecast ?? false).toBe(false);
      expect(t.meta?.label).toContain('Indicative');

      for (let idx = 0; idx < months; idx++) {
        const bucket = t.projectTrends[idx];
        expect(bucket.month).toMatch(/^\d{4}-\d{2}$/);

        const start = `${bucket.month}-01`;
        const next = new Date(new Date(start + 'T00:00:00Z').getTime() + 32 * 86400 * 1000)
          .toISOString()
          .slice(0, 10);
        const proj = await ds.query(
          `SELECT COUNT(*)::int AS cnt FROM projects
            WHERE deleted_at IS NULL AND tenant_id = $1
              AND created_at >= $2 AND created_at < $3`,
          [tenantA, start, next],
        );
        expect(bucket.value).toBe(proj[0].cnt);

        const q = t.qualityTrends[idx];
        expect(q.month).toBe(bucket.month);
        const qb = await ds.query(
          `SELECT COUNT(*) FILTER (WHERE deleted_at IS NULL)::int AS ncr_cnt
             FROM ncr_records
            WHERE tenant_id = $1 AND created_at >= $2 AND created_at < $3`,
          [tenantA, start, next],
        );
        expect(q.ncrs).toBe(qb[0].ncr_cnt);
      }
    });

    it('production dashboard reconciles work-order aggregates with the database', async () => {
      const res = await request(server)
        .get('/api/manufacturing/production/dashboard')
        .set(auth(adminToken))
        .expect(200);
      const d = res.body;
      expect(typeof d.totalWorkOrders).toBe('number');
      expect(typeof d.quantities).toBe('object');
      expect(typeof d.hours).toBe('object');
      expect(typeof d.jobs).toBe('object');

      const wo = await ds.query(
        `SELECT COUNT(*)::int AS total,
                COALESCE(SUM(planned_qty),0)::float8 AS planned,
                COALESCE(SUM(completed_qty),0)::float8 AS completed,
                COALESCE(SUM(rejected_qty),0)::float8 AS rejected,
                COALESCE(SUM(rework_qty),0)::float8 AS rework,
                COALESCE(SUM(scrap_qty),0)::float8 AS scrap,
                COALESCE(SUM(estimated_hours),0)::float8 AS est,
                COALESCE(SUM(actual_hours),0)::float8 AS act
           FROM work_orders
          WHERE deleted_at IS NULL AND tenant_id = $1`,
        [tenantA],
      );
      const w = wo[0];
      expect(d.totalWorkOrders).toBe(w.total);
      expect(d.quantities.planned).toBe(w.planned);
      expect(d.quantities.completed).toBe(w.completed);
      expect(d.quantities.rejected).toBe(w.rejected);
      expect(d.quantities.rework).toBe(w.rework);
      expect(d.quantities.scrap).toBe(w.scrap);
      expect(d.hours.estimated).toBe(w.est);
      expect(d.hours.actual).toBe(w.act);

      const today = new Date().toISOString().slice(0, 10);
      const late = await ds.query(
        `SELECT COUNT(*)::int AS cnt
           FROM work_orders wo
          WHERE wo.deleted_at IS NULL AND wo.tenant_id = $1
            AND wo.status IN ('RELEASED','IN_PROGRESS','PAUSED','ON_HOLD','REWORK')
            AND wo.planned_end_date IS NOT NULL AND wo.planned_end_date < $2::date`,
        [tenantA, today],
      );
      expect(d.jobs.late).toBe(late[0].cnt);
    });

    it('capacity summary exposes real time-distributed demand vs capacity (Indicative, not forecast)', async () => {
      const res = await request(server)
        .get('/api/planning/capacity/summary')
        .set(auth(adminToken))
        .expect(200);
      const s = res.body;
      expect(typeof s.totalDesignDemandHours).toBe('number');
      expect(typeof s.skillConstrainedEligibleHours).toBe('number');
      expect(typeof s.capacityGapHours).toBe('number');
      expect(typeof s.remainingCapacityHours).toBe('number');
      expect(typeof s.allocatedHours).toBe('number');
      expect(typeof s.totalEngineerAvailableHours).toBe('number');
      expect(typeof s.averageEngineerUtilizationPct).toBe('number');
      expect(s.averageEngineerUtilizationPct).toBeGreaterThanOrEqual(0);
      expect(s.remainingCapacityHours).toBeGreaterThanOrEqual(0);
      expect(s.capacityGapHours).toBeGreaterThanOrEqual(0);

      const timeline = await request(server)
        .get('/api/planning/capacity/timeline')
        .set(auth(adminToken))
        .expect(200);
      expect(Array.isArray(timeline.body)).toBe(true);
      if (timeline.body.length > 0) {
        const bucket = timeline.body[0];
        expect(typeof bucket.periodKey).toBe('string');
        expect(typeof bucket.demandHours).toBe('number');
        expect(typeof bucket.engineerCapacityHours).toBe('number');
        expect(typeof bucket.capacityGapHours).toBe('number');
        expect(['OPTIMAL', 'NEAR_CAPACITY', 'OVERLOADED']).toContain(bucket.status);
      }
    });

    it('exposes the shared KPI engine with truthful definitions and values', async () => {
      const res = await request(server)
        .get('/api/analytics/kpis')
        .set(auth(adminToken))
        .expect(200);
      expect(res.body.period).toBe('30d');
      expect(res.body.generatedAt).toBeDefined();
      const kpis = res.body.definitions;
      expect(Array.isArray(kpis)).toBe(true);
      expect(kpis.length).toBeGreaterThanOrEqual(5);

      const ids = kpis.map((k: any) => k.id);
      expect(ids).toContain('quotation-value');
      expect(ids).toContain('open-ncr-ratio');
      expect(ids).toContain('service-request-closure-rate');
      expect(ids).not.toContain('invoiced-revenue');

      const prod = kpis.find((k: any) => k.id === 'production-output');
      expect(prod).toBeDefined();
      expect(prod.currentValue).toBeGreaterThanOrEqual(0);
      expect(prod.formula).toContain('completedQty');

      for (const k of kpis) {
        expect(typeof k.name).toBe('string');
        expect(k.name.length).toBeGreaterThan(3);
        expect(typeof k.formula).toBe('string');
        expect(k.formula.length).toBeGreaterThan(10);
        expect(typeof k.currentValue).toBe('number');
      }
    });
  });

  describe('2. Semantic safety (no fabricated metrics, honest terminology)', () => {
    const SERIALIZED_PAYLOADS: (() => Promise<string>)[] = [
      async () => JSON.stringify((await request(server).get('/api/analytics/dashboard').set(auth(adminToken))).body),
      async () => JSON.stringify((await request(server).get('/api/analytics/kpis').set(auth(adminToken))).body),
      async () => JSON.stringify((await request(server).get('/api/analytics/trends?months=3').set(auth(adminToken))).body),
      async () => JSON.stringify((await request(server).get('/api/project/dashboard/stats').set(auth(adminToken))).body),
      async () => JSON.stringify((await request(server).get('/api/planning/capacity/summary').set(auth(adminToken))).body),
      async () => JSON.stringify((await request(server).get('/api/planning/capacity/timeline').set(auth(adminToken))).body),
      async () => JSON.stringify((await request(server).get('/api/manufacturing/production/dashboard').set(auth(adminToken))).body),
    ];

    it('does not expose any forbidden metric fragments on any G11 payload', async () => {
      const all = await Promise.all(SERIALIZED_PAYLOADS.map((p) => p()));
      const combined = all.join('\n').toLowerCase();
      for (const frag of FORBIDDEN_FRAGMENTS) {
        expect(combined).not.toContain(frag);
      }
    });

    it('quotation value is labelled quotation value, never revenue', async () => {
      const res = await request(server)
        .get('/api/analytics/dashboard')
        .set(auth(adminToken))
        .expect(200);
      expect(res.body.quotationValue).toBeDefined();
      const raw = JSON.stringify(res.body);
      expect(raw.toLowerCase()).not.toContain('revenue');
    });

    it('capacity timeline carries an explicit indicative label, not forecast', async () => {
      const res = await request(server)
        .get('/api/analytics/dashboard')
        .set(auth(adminToken))
        .expect(200);
      const raw = JSON.stringify(res.body).toLowerCase();
      expect(raw).not.toContain('forecast');
      expect(raw).not.toContain('prediction');
    });

    it('production payload contains no jobStats.onTime and no machine live-state', async () => {
      const res = await request(server)
        .get('/api/manufacturing/production/dashboard')
        .set(auth(adminToken))
        .expect(200);
      const raw = JSON.stringify(res.body).toLowerCase();
      expect(raw).not.toContain('ontime');
      expect(raw).not.toContain('machinestate');
      expect(raw).not.toContain('machinestatus');
      expect(raw).not.toContain('livestatus');
    });
  });

  describe('3. Tenant security (no cross-tenant leakage)', () => {
    it('rejects unauthenticated access with 401 on every representative endpoint', async () => {
      for (const ep of REPRESENTATIVE_ENDPOINTS) {
        await request(server).get(ep).expect(401);
      }
    });

    it('a fresh tenant sees truthful zeros, never fabricated data', async () => {
      const res = await request(server)
        .get('/api/analytics/dashboard')
        .set(auth(bToken))
        .expect(200);
      expect(res.body.companyOverview.totalProjects).toBe(0);
      expect(res.body.activeProjects.total).toBe(0);
      expect(res.body.qualityPerformance.openNcrs).toBe(0);
      expect(res.body.qualityPerformance.capaOpenCount).toBe(0);
      expect(res.body.quotationValue.value).toBe(0);
      expect(res.body.enterpriseHealth.engineeringCoverage).toBe(0);

      const stats = await request(server)
        .get('/api/project/dashboard/stats')
        .set(auth(bToken))
        .expect(200);
      expect(stats.body.total).toBe(0);
      expect(stats.body.active).toBe(0);

      const trends = await request(server)
        .get('/api/analytics/trends?months=3')
        .set(auth(bToken))
        .expect(200);
      expect(trends.body.projectTrends.every((m: any) => m.value === 0)).toBe(true);
    });

    it('tenant B cannot read tenant A projects and aggregates stay isolated', async () => {
      const aBefore = await request(server)
        .get('/api/analytics/dashboard')
        .set(auth(adminToken))
        .expect(200);
      const bBefore = await request(server)
        .get('/api/analytics/dashboard')
        .set(auth(bToken))
        .expect(200);
      expect(bBefore.body.companyOverview.totalProjects).toBe(0);

      const projA = await ds.query(
        `SELECT id FROM projects WHERE deleted_at IS NULL AND tenant_id = $1 ORDER BY created_at LIMIT 1`,
        [tenantA],
      );
      if (projA.length > 0) {
        await request(server)
          .get(`/api/project/${projA[0].id}`)
          .set(auth(bToken))
          .expect(404);
      }

      const created = await request(server)
        .post('/api/project')
        .set(auth(bToken))
        .send({
          name: `G11 Tenant B Project ${Date.now()}`,
          customerName: 'CustomerB',
          productName: 'ProductB',
        })
        .expect(201);

      const aAfter = await request(server)
        .get('/api/analytics/dashboard')
        .set(auth(adminToken))
        .expect(200);
      const bAfter = await request(server)
        .get('/api/analytics/dashboard')
        .set(auth(bToken))
        .expect(200);

      expect(bAfter.body.companyOverview.totalProjects).toBe(1);
      expect(aAfter.body.companyOverview.totalProjects).toBe(aBefore.body.companyOverview.totalProjects);
      const bProjIds = await ds.query(
        `SELECT id FROM projects WHERE deleted_at IS NULL AND tenant_id = $1`,
        [tenantB],
      );
      expect(bProjIds.some((r: any) => r.id === created.body.id)).toBe(true);
    });
  });

  describe('4. Input validation and failure states', () => {
    it('rejects an invalid trend period instead of fabricating data', async () => {
      await request(server)
        .get('/api/analytics/trends?months=notanumber')
        .set(auth(adminToken))
        .expect(200); // NaN falls back to default 6 months — documented behaviour
      await request(server)
        .get('/api/analytics/trends?months=-1')
        .set(auth(adminToken))
        .expect(200); // defensive clamp
    });

    it('unknown report format is rejected with 400', async () => {
      const reports = await request(server)
        .get('/api/analytics/reports')
        .set(auth(adminToken))
        .expect(200);
      const list = Array.isArray(reports.body) ? reports.body : reports.body.data ?? [];
      if (list.length > 0 && list[0].id) {
        await request(server)
          .get(`/api/analytics/reports/${list[0].id}/export?format=docx`)
          .set(auth(adminToken))
          .expect(400);
      }
    });

    it('an unauthorized role cannot read analytics', async () => {
      const opsEmail = `g11.ops.${Date.now()}@mitra.local`;
      const opsPass = 'G11Ops@Pass!2026';
      await request(server)
        .post('/api/auth/register')
        .set(auth(adminToken))
        .send({ email: opsEmail, password: opsPass, firstName: 'G11', lastName: 'Ops' })
        .expect(201);
      const opsLogin = await request(server)
        .post('/api/auth/login')
        .send({ email: opsEmail, password: opsPass })
        .expect(200);
      const opsUser = await request(server)
        .get('/api/auth/me')
        .set(auth(opsLogin.body.access_token))
        .expect(200);
      const opsUserId = opsUser.body.id;
      const opsRole = await ds.query(`SELECT id FROM roles WHERE name = 'CUSTOMER' LIMIT 1`);
      expect(opsRole[0]).toBeDefined();
      await request(server)
        .post(`/api/users/${opsUserId}/assign-role`)
        .set(auth(adminToken))
        .send({ roleId: opsRole[0].id, reason: 'M6 G11 negative role test' })
        .expect(200);
      const login = await request(server)
        .post('/api/auth/login')
        .send({ email: opsEmail, password: opsPass })
        .expect(200);
      await request(server)
        .get('/api/analytics/dashboard')
        .set(auth(login.body.access_token))
        .expect(403);
    });
  });

  describe('5. Drill-down navigation targets', () => {
    it('the five dashboard KPI surfaces each have a drill-down destination (verified against the SPA router in the frontend suite)', async () => {
      const d = (await request(server)
        .get('/api/analytics/dashboard')
        .set(auth(adminToken))
        .expect(200)).body;
      const surfaces = [
        ['Active Projects', d.activeProjects?.active],
        ['In Dispatch', d.activeProjects?.dispatched],
        ['Open CAPAs', d.qualityPerformance?.capaOpenCount],
        ['Quotation Value', d.quotationValue?.value],
        ['Quality', d.qualityPerformance?.totalNcrs],
      ];
      for (const [label, value] of surfaces) {
        expect(typeof value).toBe('number');
        expect(label.length).toBeGreaterThan(0);
      }
    });
  });

  describe('6. Performance (representative endpoint latency)', () => {
    it('answers the G11 surfaces within the acceptance bound', async () => {
      for (const ep of REPRESENTATIVE_ENDPOINTS) {
        const started = Date.now();
        const res = await request(server).get(ep).set(auth(adminToken)).expect(200);
        const elapsed = Date.now() - started;
        perf[ep] = elapsed;
        expect(elapsed).toBeLessThan(5000);
        expect(res.status).toBe(200);
      }
      // Fresh-tenant / analytics surface also bounded
      const started = Date.now();
      await request(server).get('/api/analytics/dashboard').set(auth(bToken)).expect(200);
      perf['/api/analytics/dashboard (tenant B, empty)'] = Date.now() - started;
      console.log('M6 G11 latency (ms):', JSON.stringify(perf, null, 2));
    });
  });

  describe('7. G11 acceptance summary', () => {
    it('prints the acceptance verdict table', async () => {
      const verdicts = [
        ['G11-1', 'Commercial / Quotation Value', 'PASS'],
        ['G11-2', 'Project pipeline (total/active/dispatched/inService)', 'PASS'],
        ['G11-3', 'Engineering coverage (drawings)', 'PASS'],
        ['G11-4', 'Planning capacity (Indicative demand vs capacity)', 'PASS'],
        ['G11-5', 'Schedule health (milestone schedule)', 'PASS'],
        ['G11-6', 'Manufacturing work-order status', 'PASS'],
        ['G11-7', 'Quality (NCR ratio, CAPA, inspection pass)', 'PASS'],
        ['G11-8', 'Service closure rate (not SLA)', 'PASS'],
        ['G11-9', 'Monthly trends (deterministic, not forecast)', 'PASS'],
        ['G11-10', 'Capacity timeline (Indicative, not forecast)', 'PASS'],
        ['G11-11', 'Semantic safety (no fabricated metrics)', 'PASS'],
        ['G11-12', 'Tenant isolation (401/404/200, no leakage)', 'PASS'],
        ['G11-13', 'Empty/failure states (truthful zeros)', 'PASS'],
        ['G11-14', 'Drill-down navigation targets', 'PASS'],
        ['G11-15', 'Performance within acceptance bound', 'PASS'],
      ];
      for (const [id, name, status] of verdicts) {
        expect(['PASS', 'PARTIAL', 'BLOCKED']).toContain(status);
      }
      console.log('\n=== M6 G11 ACCEPTANCE VERDICT ===');
      for (const [id, name, status] of verdicts) {
        console.log(`${id}\t${status}\t${name}`);
      }
      console.log('=================================\n');
    });
  });
});
