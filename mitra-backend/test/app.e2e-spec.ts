import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

describe('Application bootstrap (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('boots the full application with a real PostgreSQL connection', () => {
    expect(app).toBeDefined();
  });

  it('GET /api/health reports the database as up', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.info.database.status).toBe('up');
  });

  it('GET /api/health/liveness reports ok with process metadata', async () => {
    const res = await request(app.getHttpServer()).get('/api/health/liveness');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('GET /api/auth/me without a token is rejected (401)', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/nonexistent returns 404 (global prefix + routing sanity)', async () => {
    const res = await request(app.getHttpServer()).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});
