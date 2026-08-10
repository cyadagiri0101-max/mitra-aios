import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';

const TRACKED_USER_ID = '11111111-2222-4333-8444-555555555555';

/**
 * AI Usage E2E (v4.0 W2a):
 * Track AI usage events and verify aggregate stats (calls, tokens,
 * average response time, per-model breakdown) at tenant and per-user level.
 */
describe('AI Usage E2E (v4.0 W2a)', () => {
  let app: INestApplication;
  let server: any;
  let accessToken: string;

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  const track = (model: string, tokenEstimate: number, responseTimeMs: number) =>
    request(server)
      .post('/api/ai-usage/track')
      .set(auth())
      .send({
        userId: TRACKED_USER_ID,
        prompt: `Summarize work order progress for model ${model}`,
        modelName: model,
        tokenEstimate,
        responseTimeMs,
      });

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

  describe('Tracking', () => {
    it('tracks an AI usage event', async () => {
      const res = await track('gpt-4o', 1200, 850).expect(200);
      expect(res.body.id).toBeDefined();
      expect(res.body.modelName).toBe('gpt-4o');
      expect(res.body.tokenEstimate).toBe(1200);
    });

    it('tracks a second event with a different model', async () => {
      await track('o1-mini', 400, 320).expect(200);
      await track('gpt-4o', 800, 950).expect(200);
    });

    it('validates required fields', async () => {
      const res = await request(server)
        .post('/api/ai-usage/track')
        .set(auth())
        .send({ userId: TRACKED_USER_ID })
        .expect(400);
      expect(res.body.message).toBeDefined();
    });

    it('rejects unauthenticated access', async () => {
      await request(server).post('/api/ai-usage/track').send({ userId: TRACKED_USER_ID }).expect(401);
    });
  });

  describe('Aggregations', () => {
    it('returns aggregate stats over the default window', async () => {
      const res = await request(server)
        .get('/api/ai-usage/stats')
        .set(auth())
        .expect(200);
      expect(res.body.totalCalls).toBeGreaterThanOrEqual(3);
      expect(res.body.totalTokens).toBeGreaterThanOrEqual(2400);
      expect(res.body.averageResponseTimeMs).toBeGreaterThan(0);
      expect(res.body.callsByModel['gpt-4o']).toBeGreaterThanOrEqual(2);
      expect(res.body.callsByModel['o1-mini']).toBeGreaterThanOrEqual(1);
      expect(new Date(res.body.periodStart).getTime()).toBeLessThan(new Date(res.body.periodEnd).getTime());
    });

    it('honours a custom days window', async () => {
      const res = await request(server)
        .get('/api/ai-usage/stats?days=30')
        .set(auth())
        .expect(200);
      expect(res.body.totalCalls).toBeGreaterThanOrEqual(3);
    });

    it('returns per-user usage for the tracked user', async () => {
      const res = await request(server)
        .get(`/api/ai-usage/user/${TRACKED_USER_ID}?days=30`)
        .set(auth())
        .expect(200);
      expect(res.body.totalCalls).toBeGreaterThanOrEqual(3);
      expect(res.body.callsByModel['o1-mini']).toBeGreaterThanOrEqual(1);
    });

    it('returns zeroed stats for an unknown user', async () => {
      const res = await request(server)
        .get('/api/ai-usage/user/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee?days=30')
        .set(auth())
        .expect(200);
      expect(res.body.totalCalls).toBe(0);
      expect(res.body.totalTokens).toBe(0);
      expect(res.body.averageResponseTimeMs).toBe(0);
    });
  });
});
