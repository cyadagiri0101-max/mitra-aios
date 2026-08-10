import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';

const unique = (p: string) => `${p}-${Date.now()}`;

/**
 * Manufacturing E2E (v4.0 W1a):
 * Released engineering artifacts (drawing / BOM / routing) → work order →
 * release (immutable execution package: job cards, reservations, checkpoints)
 * → shop-floor execution → production tracking.
 */
describe('Manufacturing E2E (v4.0 W1a)', () => {
  let app: INestApplication;
  let server: any;
  let accessToken: string;
  let projectId: string;
  let drawingId: string;
  let bomId: string;
  let routingId: string;
  let workOrderId: string;
  let jobCardId: string;
  let checkpointId: string;
  let reservationId: string;

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  const walkToReleased = async (entityType: string, id: string) => {
    for (let i = 0; i < 8; i++) {
      const wf = await request(server)
        .get(`/api/engineering/${entityType}/${id}/workflow`)
        .set(auth());
      expect(wf.status).toBe(200);
      if (wf.body.currentState?.stateCode === 'RELEASED') return;
      const t = wf.body.availableTransitions?.[0];
      expect(t).toBeDefined();
      const res = await request(server)
        .post(`/api/engineering/${entityType}/${id}/workflow/transition`)
        .set(auth())
        .send({ transitionId: t.id, remarks: 'e2e release' });
      expect(res.status).toBe(200);
      if (res.body.transition?.to === 'RELEASED') return;
    }
    throw new Error(`Could not release ${entityType} ${id}`);
  };

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
      .send({ name: unique('E2E Mfg Project'), customerName: 'E2E Customer', productName: 'Cavity Block', cavitation: 2 })
      .expect(201);
    projectId = project.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Released engineering artifacts', () => {
    it('creates and releases a drawing', async () => {
      const res = await request(server)
        .post('/api/engineering/drawings')
        .set(auth())
        .send({ projectId, title: unique('Core Insert'), drawingType: 'PART', partNumber: 'P-100' })
        .expect(201);
      drawingId = res.body.id;
      expect(res.body.drawingNumber).toMatch(/^DRW-/);
      await walkToReleased('drawing', drawingId);
    });

    it('creates a BOM with items and releases it', async () => {
      const bom = await request(server)
        .post('/api/engineering/boms')
        .set(auth())
        .send({ projectId, name: unique('Core Assembly'), drawingId, revisionCode: 'A' })
        .expect(201);
      bomId = bom.body.id;
      expect(bom.body.bomNumber).toMatch(/^BOM-/);

      await request(server)
        .post(`/api/engineering/boms/${bomId}/items`)
        .set(auth())
        .send({ partNumber: 'P-200', partName: 'Screw M6', itemType: 'FASTENER', quantityPer: 4, unitCost: 1.5 })
        .expect(201);

      await walkToReleased('bom', bomId);
    });

    it('creates a work center, routing with operations and releases it', async () => {
      const wc = await request(server)
        .post('/api/engineering/work-centers')
        .set(auth())
        .send({ projectId, code: unique('CNC-'), name: 'CNC Machining', type: 'CNC', hourlyRate: 850 })
        .expect(201);

      const rtg = await request(server)
        .post('/api/engineering/routings')
        .set(auth())
        .send({ projectId, routingName: unique('Core Insert Process'), bomId })
        .expect(201);
      routingId = rtg.body.id;
      expect(rtg.body.routingNumber).toMatch(/^RTG-/);

      await request(server)
        .post(`/api/engineering/routings/${routingId}/operations`)
        .set(auth())
        .send({
          sequence: 10,
          operationName: 'Rough milling',
          workCenterId: wc.body.id,
          setupTimeMinutes: 30,
          cycleTimeMinutes: 45,
          qualityCheckpoints: [
            { name: 'Surface finish check', dimension: 'Ra 0.8', tolerance: '+/-0.1', instrument: 'Roughness tester', method: 'Visual / measurement', is_critical: true },
          ],
        })
        .expect(201);

      await walkToReleased('routing', routingId);
    });
  });

  describe('Work order lifecycle', () => {
    it('creates a DRAFT work order against released artifacts', async () => {
      const res = await request(server)
        .post('/api/manufacturing/work-orders')
        .set(auth())
        .send({
          projectId,
          partName: unique('Core Insert'),
          operationType: 'MANUFACTURING',
          drawingId,
          bomId,
          routingId,
          priority: 'HIGH',
          instructions: 'E2E release-through-production journey',
        })
        .expect(201);
      workOrderId = res.body.id;
      expect(workOrderId).toBeDefined();
      expect(res.body.woNumber).toMatch(/^WO-/);
      expect(res.body.status).toBe('DRAFT');
    });

    it('validates required DTO fields (projectId)', async () => {
      const res = await request(server)
        .post('/api/manufacturing/work-orders')
        .set(auth())
        .send({ partName: 'Missing Project', operationType: 'MANUFACTURING' })
        .expect(400);
      expect(res.body.message).toBeDefined();
    });

    it('rejects release of an unknown work order', async () => {
      await request(server)
        .post(`/api/manufacturing/work-orders/${crypto.randomUUID()}/release`)
        .set(auth())
        .expect(404);
    });

    it('rejects release without authentication', async () => {
      await request(server)
        .post(`/api/manufacturing/work-orders/${workOrderId}/release`)
        .expect(401);
    });

    it('releases the work order, generating job cards, checkpoints and reservations', async () => {
      const res = await request(server)
        .post(`/api/manufacturing/work-orders/${workOrderId}/release`)
        .set(auth())
        .expect(201);
      expect(res.body.status).toBe('RELEASED');
      expect(res.body.transition.from).toBe('DRAFT');
      expect(res.body.transition.to).toBe('RELEASED');

      const jobs = await request(server)
        .get(`/api/manufacturing/work-orders/${workOrderId}/job-cards`)
        .set(auth())
        .expect(200);
      expect(Array.isArray(jobs.body)).toBe(true);
      expect(jobs.body.length).toBeGreaterThan(0);
      jobCardId = jobs.body[0].id;
      expect(jobs.body[0].jobCardNumber).toMatch(/^JC-/);

      const checkpoints = await request(server)
        .get(`/api/manufacturing/work-orders/${workOrderId}/checkpoints`)
        .set(auth())
        .expect(200);
      expect(Array.isArray(checkpoints.body)).toBe(true);
      expect(checkpoints.body.length).toBeGreaterThan(0);
      checkpointId = checkpoints.body[0].id;

      const reservations = await request(server)
        .get(`/api/manufacturing/work-orders/${workOrderId}/reservations`)
        .set(auth())
        .expect(200);
      expect(Array.isArray(reservations.body)).toBe(true);
      expect(reservations.body.length).toBeGreaterThan(0);
      reservationId = reservations.body[0].id;
    });

    it('rejects re-release of a non-DRAFT work order', async () => {
      await request(server)
        .post(`/api/manufacturing/work-orders/${workOrderId}/release`)
        .set(auth())
        .expect(400);
    });

    it('starts the work order (RELEASED -> IN_PROGRESS)', async () => {
      const res = await request(server)
        .post(`/api/manufacturing/work-orders/${workOrderId}/transition`)
        .set(auth())
        .send({ transition: 'START', remarks: 'E2E start' })
        .expect(201);
      expect(res.body.status).toBe('IN_PROGRESS');
    });

    it('rejects an invalid transition key', async () => {
      await request(server)
        .post(`/api/manufacturing/work-orders/${workOrderId}/transition`)
        .set(auth())
        .send({ transition: 'FLY' })
        .expect(400);
    });
  });

  describe('Shop floor execution', () => {
    it('starts the first job card', async () => {
      const res = await request(server)
        .post(`/api/manufacturing/job-cards/${jobCardId}/start`)
        .set(auth())
        .send({ remarks: 'E2E job start' })
        .expect(201);
      expect(res.body.status).toBe('IN_PROGRESS');
    });

    it('logs production output on the job card', async () => {
      const res = await request(server)
        .post(`/api/manufacturing/job-cards/${jobCardId}/production`)
        .set(auth())
        .send({ qtyProduced: 6, remarks: 'E2E production log' })
        .expect(201);
      expect(res.body.totals.produced).toBeGreaterThan(0);
    });

    it('issues a material reservation', async () => {
      const res = await request(server)
        .post(`/api/manufacturing/materials/reservations/${reservationId}/issue`)
        .set(auth())
        .send({ remarks: 'E2E issue' })
        .expect(201);
      expect(['ISSUED', 'PARTIALLY_ISSUED', 'RESERVED']).toContain(res.body.status);
    });

    it('completes the job card and rolls up the work order', async () => {
      const res = await request(server)
        .post(`/api/manufacturing/job-cards/${jobCardId}/transition`)
        .set(auth())
        .send({ transition: 'COMPLETE', remarks: 'E2E job complete' })
        .expect(201);
      expect(['COMPLETED', 'IN_PROGRESS']).toContain(res.body.status);

      const wo = await request(server)
        .get(`/api/manufacturing/work-orders/${workOrderId}`)
        .set(auth())
        .expect(200);
      expect(['COMPLETED', 'IN_PROGRESS']).toContain(wo.body.status);
    });

    it('records an inspection checkpoint result', async () => {
      const res = await request(server)
        .post(`/api/manufacturing/inspection/checkpoints/${checkpointId}/result`)
        .set(auth())
        .send({ result: 'PASS', remarks: 'E2E pass' })
        .expect(201);
      expect(res.body.status).toBe('PASS');
    });
  });

  describe('Production tracking', () => {
    it('returns the production dashboard', async () => {
      const res = await request(server)
        .get('/api/manufacturing/production/dashboard')
        .set(auth())
        .expect(200);
      expect(res.body.statusCounts).toBeDefined();
      expect(res.body.totalWorkOrders).toBeGreaterThan(0);
    });

    it('returns the production board filtered by project', async () => {
      const res = await request(server)
        .get(`/api/manufacturing/production/board?projectId=${projectId}`)
        .set(auth())
        .expect(200);
      const lanes = Object.values(res.body) as any[][];
      expect(lanes.some((lane) => lane.some((wo) => wo.id === workOrderId))).toBe(true);
    });

    it('returns production history for the work order', async () => {
      const res = await request(server)
        .get(`/api/manufacturing/production/history/${workOrderId}`)
        .set(auth())
        .expect(200);
      expect(res.body.events).toBeDefined();
      expect(res.body.events.length).toBeGreaterThan(0);
    });
  });

  describe('Work order querying', () => {
    it('paginates work orders and includes the created one', async () => {
      const res = await request(server)
        .get('/api/manufacturing/work-orders?page=1&limit=10')
        .set(auth())
        .expect(200);
      const items = Array.isArray(res.body) ? res.body : res.body.data;
      expect(Array.isArray(items)).toBe(true);
      expect(items.some((wo: { id: string }) => wo.id === workOrderId)).toBe(true);
    });

    it('returns 401 for unauthenticated access', async () => {
      await request(server).get('/api/manufacturing/work-orders').expect(401);
    });
  });
});
