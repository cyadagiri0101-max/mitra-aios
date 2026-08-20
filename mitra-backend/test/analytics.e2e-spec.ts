import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';

/**
 * Analytics E2E (v4.0 W3):
 * Executive dashboard payload, widget catalogue, KPI definitions with computed
 * values, and report catalogue / export generation.
 */
describe('Analytics E2E (v4.0 W3)', () => {
  let app: INestApplication;
  let server: any;
  let accessToken: string;

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  beforeAll(async () => {
    ({ app } = await createTestApp());
    server = app.getHttpServer();
    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(login.status).toBe(200);
    accessToken = login.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Executive dashboard', () => {
    it('assembles the dashboard payload from domain services', async () => {
      const res = await request(server)
        .get('/api/analytics/dashboard')
        .set(auth())
        .expect(200);
      expect(res.body.companyOverview).toBeDefined();
      expect(res.body.companyOverview.totalProjects).toBeGreaterThanOrEqual(0);
      expect(typeof res.body.companyOverview.quotationValue).toBe('number');
      expect(res.body.companyOverview).not.toHaveProperty('revenue');
      expect(res.body.quotationValue).toBeDefined();
      expect(res.body.qualityPerformance.openRatioPct).toBeDefined();
      expect(res.body.qualityPerformance).not.toHaveProperty('defectRatePct');
      expect(res.body.qualityPerformance.ncrBySeverity).toBeDefined();
      expect(res.body.qualityPerformance.capaByStatus).toBeDefined();
      expect(res.body.qualityPerformance.capaOpenCount).toBeDefined();
      expect(res.body.qualityPerformance.inspectionPassRate.passRatePct).toBeDefined();
      expect(res.body.serviceStatus.closureRatePct).toBeDefined();
      expect(res.body.serviceStatus).not.toHaveProperty('slaCompliancePct');
      expect(res.body.costPerformance).toBeDefined();
      expect(res.body.activeProjects.delayedProjects).toBeDefined();
      expect(res.body.activeProjects.completionPct).toBeDefined();
    });

    it('lists dashboard widgets', async () => {
      const res = await request(server)
        .get('/api/analytics/dashboard/widgets')
        .set(auth())
        .expect(200);
      const items = Array.isArray(res.body) ? res.body : res.body.items;
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
    });

    it('rejects unauthenticated access', async () => {
      await request(server).get('/api/analytics/dashboard').expect(401);
    });
  });

  describe('Trends', () => {
    it('returns monthly project and quality time series with matching months', async () => {
      const res = await request(server)
        .get('/api/analytics/trends?months=3')
        .set(auth())
        .expect(200);
      expect(Array.isArray(res.body.projectTrends)).toBe(true);
      expect(Array.isArray(res.body.qualityTrends)).toBe(true);
      expect(res.body.projectTrends.length).toBe(3);
      expect(res.body.qualityTrends.length).toBe(3);
      expect(res.body.projectTrends[0]).toHaveProperty('month');
      expect(res.body.projectTrends[0]).toHaveProperty('value');
      expect(res.body.qualityTrends[0]).toHaveProperty('ncrs');
      expect(res.body.qualityTrends[0]).toHaveProperty('capas');
    });

    it('rejects unauthenticated access', async () => {
      await request(server).get('/api/analytics/trends').expect(401);
    });
  });

  describe('KPIs', () => {
    it('returns semantic-hardened KPI definitions with computed values', async () => {
      const res = await request(server)
        .get('/api/analytics/kpis?period=30d')
        .set(auth())
        .expect(200);
      const items = res.body.definitions;
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      const ids = items.map((d: any) => d.id);
      expect(ids).toContain('quotation-value');
      expect(ids).toContain('open-ncr-ratio');
      expect(ids).toContain('service-request-closure-rate');
      expect(ids).not.toContain('revenue');
      expect(ids).not.toContain('quality-defect-rate');
      expect(ids).not.toContain('service-sla-compliance');
      const output = items.find((d: any) => d.id === 'production-output');
      expect(output.currentValue).toBeGreaterThanOrEqual(0);
    });

    it('accepts a custom period', async () => {
      const res = await request(server)
        .get('/api/analytics/kpis?period=7d')
        .set(auth())
        .expect(200);
      expect(res.body.period).toBe('7d');
      expect(Array.isArray(res.body.definitions)).toBe(true);
    });
  });

  describe('Reports', () => {
    it('lists report templates and saved reports', async () => {
      const res = await request(server)
        .get('/api/analytics/reports')
        .set(auth())
        .expect(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.items[0].id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('generates an export for a known report', async () => {
      const reports = await request(server)
        .get('/api/analytics/reports')
        .set(auth())
        .expect(200);
      const res = await request(server)
        .get(`/api/analytics/reports/${reports.body.items[0].id}/export?format=json`)
        .set(auth())
        .expect(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.reportId).toBe(reports.body.items[0].id);
      expect(res.body.format).toBe('json');
    });

    it('rejects a malformed report id', async () => {
      await request(server)
        .get('/api/analytics/reports/not-a-uuid/export')
        .set(auth())
        .expect(400);
    });
  });
});
