import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';

const unique = (p: string) => `${p}-${Date.now()}`;

/**
 * Quality E2E (v4.0 W1b):
 * NCR lifecycle (OPEN → INVESTIGATION → ACTION → VERIFIED → CLOSED) and
 * CAPA record lifecycle (create → update → close → remove), incl. guard rails.
 */
describe('Quality E2E (v4.0 W1b)', () => {
  let app: INestApplication;
  let server: any;
  let accessToken: string;
  let projectId: string;
  let ncrId: string;
  let capaId: string;

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  beforeAll(async () => {
    ({ app } = await createTestApp());
    server = app.getHttpServer();
    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(login.status).toBe(200);
    accessToken = login.body.access_token;

    const project = await request(server)
      .post('/api/project')
      .set(auth())
      .send({ name: unique('E2E Quality Project'), customerName: 'E2E Customer', productName: 'Slider', cavitation: 1 })
      .expect(201);
    projectId = project.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('NCR lifecycle', () => {
    it('creates an OPEN NCR against the project', async () => {
      const res = await request(server)
        .post('/api/quality/ncr')
        .set(auth())
        .send({
          projectId,
          description: 'E2E: ejector pin marks on cavity side',
          severity: 'CRITICAL',
          ncrType: 'INTERNAL',
          detectedQty: 3,
          materialLot: 'LOT-E2E-01',
        })
        .expect(201);
      ncrId = res.body.id;
      expect(res.body.ncrNumber).toMatch(/^NCR-/);
      expect(res.body.status).toBe('OPEN');
      expect(res.body.severity).toBe('CRITICAL');
    });

    it('opens an investigation (OPEN -> INVESTIGATION)', async () => {
      const res = await request(server)
        .patch(`/api/quality/ncr/${ncrId}/transition`)
        .set(auth())
        .send({ toStatus: 'INVESTIGATION', remarks: 'Root cause analysis started' })
        .expect(200);
      expect(res.body.status).toBe('INVESTIGATION');
    });

    it('rejects an illegal transition (INVESTIGATION -> VERIFIED)', async () => {
      const res = await request(server)
        .patch(`/api/quality/ncr/${ncrId}/transition`)
        .set(auth())
        .send({ toStatus: 'VERIFIED' })
        .expect(400);
      expect(res.body.message).toContain('Illegal NCR transition');
    });

    it('drives to ACTION and VERIFIED', async () => {
      const action = await request(server)
        .patch(`/api/quality/ncr/${ncrId}/transition`)
        .set(auth())
        .send({ toStatus: 'ACTION', remarks: 'Correction defined' })
        .expect(200);
      expect(action.body.status).toBe('ACTION');

      const verified = await request(server)
        .patch(`/api/quality/ncr/${ncrId}/transition`)
        .set(auth())
        .send({ toStatus: 'VERIFIED', remarks: 'Correction effective' })
        .expect(200);
      expect(verified.body.status).toBe('VERIFIED');
    });

    it('closes the NCR with disposition and stamps closedAt', async () => {
      const res = await request(server)
        .patch(`/api/quality/ncr/${ncrId}/transition`)
        .set(auth())
        .send({ toStatus: 'CLOSED', disposition: 'REWORK', remarks: 'Parts reworked and re-inspected' })
        .expect(200);
      expect(res.body.status).toBe('CLOSED');
      expect(res.body.disposition).toBe('REWORK');
      expect(res.body.closedAt).toBeDefined();
    });

    it('rejects a transition from CLOSED', async () => {
      await request(server)
        .patch(`/api/quality/ncr/${ncrId}/transition`)
        .set(auth())
        .send({ toStatus: 'OPEN' })
        .expect(400);
    });

    it('filters NCRs by status', async () => {
      const res = await request(server)
        .get('/api/quality/ncr?status=CLOSED')
        .set(auth())
        .expect(200);
      expect(res.body.data.some((n: { id: string }) => n.id === ncrId)).toBe(true);
    });

    it('returns 404 for an unknown NCR', async () => {
      await request(server)
        .get(`/api/quality/ncr/${crypto.randomUUID()}`)
        .set(auth())
        .expect(404);
    });
  });

  describe('CAPA lifecycle', () => {
    it('creates a CORRECTIVE CAPA linked to the project', async () => {
      const res = await request(server)
        .post('/api/capa')
        .set(auth())
        .send({
          capaNumber: unique('CA-'),
          projectId,
          problemDescription: 'E2E: flashing around ejector pin area',
          capaType: 'CORRECTIVE',
          targetDate: '2026-09-30',
        })
        .expect(201);
      capaId = res.body.id;
      expect(res.body.status).toBe('OPEN');
      expect(res.body.capaType).toBe('CORRECTIVE');
    });

    it('validates required CAPA fields', async () => {
      const res = await request(server)
        .post('/api/capa')
        .set(auth())
        .send({ capaNumber: unique('CA-') })
        .expect(400);
      expect(res.body.message).toBeDefined();
    });

    it('updates root cause and corrective action', async () => {
      const res = await request(server)
        .patch(`/api/capa/${capaId}`)
        .set(auth())
        .send({
          rootCause: 'Insufficient clamp pressure',
          correctiveAction: 'Increase clamp pressure; recalibrate press',
          preventiveAction: 'Update mold maintenance schedule',
          status: 'IN_PROGRESS',
        })
        .expect(200);
      expect(res.body.rootCause).toBe('Insufficient clamp pressure');
      expect(res.body.status).toBe('IN_PROGRESS');
    });

    it('lists CAPAs and includes the created one', async () => {
      const res = await request(server)
        .get('/api/capa')
        .set(auth())
        .expect(200);
      const items = Array.isArray(res.body) ? res.body : res.body.data;
      expect(items.some((c: { id: string }) => c.id === capaId)).toBe(true);
    });

    it('removes the CAPA (soft delete)', async () => {
      await request(server).delete(`/api/capa/${capaId}`).set(auth()).expect(204);
      await request(server).get(`/api/capa/${capaId}`).set(auth()).expect(404);
    });

    it('rejects unauthenticated access', async () => {
      await request(server).get('/api/capa').expect(401);
    });
  });
});
