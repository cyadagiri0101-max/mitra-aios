import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';

const unique = (p: string) => `${p}-${Date.now()}`;

/**
 * Cross-domain E2E (v4.0 W1d):
 * One product journey across modules — engineering release → manufacturing
 * execution → quality NCR against the produced job → service request for the
 * project — proving released artifacts, job cards and quality/service records
 * stay linked end-to-end.
 */
describe('Cross-domain E2E (v4.0 W1d)', () => {
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
  let ncrId: string;
  let requestId: string;

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
      .send({ name: unique('E2E Cross Project'), customerName: 'E2E Customer', productName: 'Core Insert', cavitation: 1 })
      .expect(201);
    projectId = project.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Engineering release', () => {
    it('releases drawing, BOM, work center and routing', async () => {
      const drawing = await request(server)
        .post('/api/engineering/drawings')
        .set(auth())
        .send({ projectId, title: unique('Cross Core Insert'), drawingType: 'PART', partNumber: 'P-300' })
        .expect(201);
      drawingId = drawing.body.id;
      await walkToReleased('drawing', drawingId);

      const bom = await request(server)
        .post('/api/engineering/boms')
        .set(auth())
        .send({ projectId, name: unique('Cross Assembly'), drawingId, revisionCode: 'A' })
        .expect(201);
      bomId = bom.body.id;
      await request(server)
        .post(`/api/engineering/boms/${bomId}/items`)
        .set(auth())
        .send({ partNumber: 'P-400', partName: 'Screw M8', itemType: 'FASTENER', quantityPer: 2, unitCost: 2.0 })
        .expect(201);
      await walkToReleased('bom', bomId);

      const wc = await request(server)
        .post('/api/engineering/work-centers')
        .set(auth())
        .send({ projectId, code: unique('VMC-'), name: 'VMC Machining', type: 'CNC', hourlyRate: 950 })
        .expect(201);

      const rtg = await request(server)
        .post('/api/engineering/routings')
        .set(auth())
        .send({ projectId, routingName: unique('Cross Process'), bomId })
        .expect(201);
      routingId = rtg.body.id;
      await request(server)
        .post(`/api/engineering/routings/${routingId}/operations`)
        .set(auth())
        .send({
          sequence: 10,
          operationName: 'Finish milling',
          workCenterId: wc.body.id,
          setupTimeMinutes: 20,
          cycleTimeMinutes: 30,
          qualityCheckpoints: [
            { name: 'Dimension check', dimension: 'Ø12.00', tolerance: '+/-0.02', instrument: 'Micrometer', method: 'Measurement', is_critical: true },
          ],
        })
        .expect(201);
      await walkToReleased('routing', routingId);
    });
  });

  describe('2. Manufacturing execution', () => {
    it('creates, releases and starts the work order', async () => {
      const wo = await request(server)
        .post('/api/manufacturing/work-orders')
        .set(auth())
        .send({
          projectId,
          partName: unique('Cross Core Insert'),
          operationType: 'MANUFACTURING',
          drawingId,
          bomId,
          routingId,
          priority: 'HIGH',
          instructions: 'Cross-domain journey',
        })
        .expect(201);
      workOrderId = wo.body.id;
      expect(wo.body.status).toBe('DRAFT');

      const released = await request(server)
        .post(`/api/manufacturing/work-orders/${workOrderId}/release`)
        .set(auth())
        .expect(201);
      expect(released.body.status).toBe('RELEASED');

      const jobs = await request(server)
        .get(`/api/manufacturing/work-orders/${workOrderId}/job-cards`)
        .set(auth())
        .expect(200);
      jobCardId = jobs.body[0].id;

      const checkpoints = await request(server)
        .get(`/api/manufacturing/work-orders/${workOrderId}/checkpoints`)
        .set(auth())
        .expect(200);
      checkpointId = checkpoints.body[0].id;

      const reservations = await request(server)
        .get(`/api/manufacturing/work-orders/${workOrderId}/reservations`)
        .set(auth())
        .expect(200);
      reservationId = reservations.body[0].id;

      await request(server)
        .post(`/api/manufacturing/work-orders/${workOrderId}/transition`)
        .set(auth())
        .send({ transition: 'START', remarks: 'Cross start' })
        .expect(201);
    });

    it('executes the job card: start, produce, issue, complete, inspect', async () => {
      const started = await request(server)
        .post(`/api/manufacturing/job-cards/${jobCardId}/start`)
        .set(auth())
        .send({ remarks: 'Cross job start' })
        .expect(201);
      expect(started.body.status).toBe('IN_PROGRESS');

      await request(server)
        .post(`/api/manufacturing/job-cards/${jobCardId}/production`)
        .set(auth())
        .send({ qtyProduced: 4, remarks: 'Cross production' })
        .expect(201);

      await request(server)
        .post(`/api/manufacturing/materials/reservations/${reservationId}/issue`)
        .set(auth())
        .send({ remarks: 'Cross issue' })
        .expect(201);

      await request(server)
        .post(`/api/manufacturing/job-cards/${jobCardId}/transition`)
        .set(auth())
        .send({ transition: 'COMPLETE', remarks: 'Cross complete' })
        .expect(201);

      const checkpoint = await request(server)
        .post(`/api/manufacturing/inspection/checkpoints/${checkpointId}/result`)
        .set(auth())
        .send({ result: 'PASS', remarks: 'Cross pass' })
        .expect(201);
      expect(checkpoint.body.status).toBe('PASS');
    });
  });

  describe('3. Quality against production output', () => {
    it('opens and closes an NCR linked to the produced job', async () => {
      const created = await request(server)
        .post('/api/quality/ncr')
        .set(auth())
        .send({
          projectId,
          workOrderId,
          jobCardId,
          description: 'Cross-domain: surface scratch on finished job',
          severity: 'MAJOR',
          ncrType: 'INTERNAL',
          detectedQty: 1,
          materialLot: 'LOT-CROSS-01',
        })
        .expect(201);
      ncrId = created.body.id;
      expect(created.body.workOrderId).toBe(workOrderId);
      expect(created.body.jobCardId).toBe(jobCardId);

      await request(server)
        .patch(`/api/quality/ncr/${ncrId}/transition`)
        .set(auth())
        .send({ toStatus: 'INVESTIGATION', remarks: 'Cross RCA' })
        .expect(200);
      await request(server)
        .patch(`/api/quality/ncr/${ncrId}/transition`)
        .set(auth())
        .send({ toStatus: 'ACTION', remarks: 'Cross correction' })
        .expect(200);
      await request(server)
        .patch(`/api/quality/ncr/${ncrId}/transition`)
        .set(auth())
        .send({ toStatus: 'VERIFIED', remarks: 'Cross verified' })
        .expect(200);
      const closed = await request(server)
        .patch(`/api/quality/ncr/${ncrId}/transition`)
        .set(auth())
        .send({ toStatus: 'CLOSED', disposition: 'SCRAP', remarks: 'Part scrapped, replacement produced' })
        .expect(200);
      expect(closed.body.status).toBe('CLOSED');
      expect(closed.body.closedAt).toBeDefined();

      const filtered = await request(server)
        .get(`/api/quality/ncr?workOrderId=${workOrderId}&status=CLOSED`)
        .set(auth())
        .expect(200);
      expect(filtered.body.data.some((n: { id: string }) => n.id === ncrId)).toBe(true);
    });
  });

  describe('4. Service for the project', () => {
    it('creates a service request and closes it', async () => {
      const created = await request(server)
        .post('/api/service/requests')
        .set(auth())
        .send({
          customerName: 'E2E Customer',
          issueDescription: 'Cross-domain: follow-up service after production issue',
          reportedDate: '2026-08-04',
          serviceType: 'MAINTENANCE',
          projectId,
          priority: 'MEDIUM',
          warrantyClaim: false,
        })
        .expect(201);
      requestId = created.body.id;
      expect(created.body.srNumber).toMatch(/^SR-/);
      expect(created.body.status).toBe('OPEN');
      expect(created.body.projectId).toBe(projectId);

      await request(server)
        .patch(`/api/service/requests/${requestId}`)
        .set(auth())
        .send({ status: 'IN_PROGRESS' })
        .expect(200);
      const closed = await request(server)
        .patch(`/api/service/requests/${requestId}/close`)
        .set(auth())
        .expect(200);
      expect(closed.body.status).toBe('CLOSED');
    });
  });

  describe('5. End-to-end traceability', () => {
    it('rolls up the full journey into tracking and dashboards', async () => {
      const history = await request(server)
        .get(`/api/manufacturing/production/history/${workOrderId}`)
        .set(auth())
        .expect(200);
      expect(history.body.events.length).toBeGreaterThan(0);

      const dashboard = await request(server)
        .get('/api/manufacturing/production/dashboard')
        .set(auth())
        .expect(200);
      expect(dashboard.body.totalWorkOrders).toBeGreaterThan(0);

      const sr = await request(server)
        .get(`/api/service/requests/${requestId}`)
        .set(auth())
        .expect(200);
      expect(sr.body.status).toBe('CLOSED');
      expect(sr.body.projectId).toBe(projectId);
    });
  });
});
