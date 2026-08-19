import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';

const unique = (p: string) => `${p}-${Date.now()}`;

/**
 * Service E2E (v4.0 W1c):
 * Service request lifecycle (create → update → close), service visits,
 * warranty + claims, AMC contracts and spare-parts catalog.
 */
describe('Service E2E (v4.0 W1c)', () => {
  let app: INestApplication;
  let server: any;
  let accessToken: string;
  let projectId: string;
  let requestId: string;
  let visitId: string;
  let warrantyId: string;
  let claimId: string;
  let amcId: string;

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
      .send({ name: unique('E2E Service Project'), customerName: 'E2E Customer', productName: 'Mold Base', cavitation: 1 })
      .expect(201);
    projectId = project.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Service requests', () => {
    it('creates a service request with auto-generated SR number', async () => {
      const res = await request(server)
        .post('/api/service/requests')
        .set(auth())
        .send({
          customerName: 'E2E Customer',
          issueDescription: 'Ejector pins sticking after 50k shots',
          reportedDate: '2026-08-04',
          serviceType: 'REPAIR',
          projectId,
          priority: 'HIGH',
          warrantyClaim: false,
          costEstimate: 2500,
        })
        .expect(201);
      requestId = res.body.id;
      expect(res.body.srNumber).toMatch(/^SR-/);
      expect(res.body.status).toBe('OPEN');
      expect(res.body.serviceType).toBe('REPAIR');
    });

    it('validates required fields', async () => {
      const res = await request(server)
        .post('/api/service/requests')
        .set(auth())
        .send({ customerName: 'E2E Customer' })
        .expect(400);
      expect(res.body.message).toBeDefined();
    });

    it('updates the request (assign priority, acknowledge)', async () => {
      const res = await request(server)
        .patch(`/api/service/requests/${requestId}`)
        .set(auth())
        .send({ status: 'ACKNOWLEDGED', resolutionSummary: 'Technician scheduled' })
        .expect(200);
      expect(res.body.status).toBe('ACKNOWLEDGED');
    });

    it('closes the request', async () => {
      const res = await request(server)
        .patch(`/api/service/requests/${requestId}/close`)
        .set(auth())
        .expect(200);
      expect(res.body.status).toBe('CLOSED');
    });

    it('returns 404 for an unknown request', async () => {
      await request(server)
        .get(`/api/service/requests/${crypto.randomUUID()}`)
        .set(auth())
        .expect(404);
    });

    it('rejects unauthenticated access', async () => {
      await request(server).get('/api/service/requests').expect(401);
    });
  });

  describe('Service visits', () => {
    it('creates a service visit', async () => {
      const res = await request(server)
        .post('/api/service/visits')
        .set(auth())
        .send({
          visitNumber: unique('VIS-'),
          serviceRequestId: requestId,
          projectId,
          visitDate: '2026-08-10',
          serviceType: 'REPAIR',
          workPerformed: 'Replaced ejector pins, greased slides',
          partsUsed: [{ partCode: 'PIN-6', partName: 'Ejector pin 6mm', qty: 4 }],
        })
        .expect(201);
      visitId = res.body.id;
      expect(res.body.visitNumber).toMatch(/^VIS-/);
    });

    it('lists visits and includes the created one', async () => {
      const res = await request(server)
        .get('/api/service/visits')
        .set(auth())
        .expect(200);
      const items = Array.isArray(res.body) ? res.body : res.body.data;
      expect(items.some((v: { id: string }) => v.id === visitId)).toBe(true);
    });

    it('updates visit work performed', async () => {
      const res = await request(server)
        .patch(`/api/service/visits/${visitId}`)
        .set(auth())
        .send({ workPerformed: 'Replaced pins; trial run 200 shots OK' })
        .expect(200);
      expect(res.body.workPerformed).toContain('trial run');
    });

    it('transitions visit status to COMPLETED via PATCH', async () => {
      const res = await request(server)
        .patch(`/api/service/visits/${visitId}`)
        .set(auth())
        .send({ status: 'COMPLETED' })
        .expect(200);
      expect(res.body.status).toBe('COMPLETED');
    });
  });

  describe('Warranty and claims', () => {
    it('creates a warranty record', async () => {
      const res = await request(server)
        .post('/api/service/warranty')
        .set(auth())
        .send({
          warrantyNumber: unique('WAR-'),
          projectId,
          warrantyStartDate: '2026-01-01',
          warrantyEndDate: '2027-01-01',
          coverageMonths: 12,
          coverageTerms: 'Parts and labour',
          eligibilityRule: 'Valid on registration',
          claimLimit: 50000,
        })
        .expect(201);
      warrantyId = res.body.id;
      expect(res.body.warrantyNumber).toMatch(/^WAR-/);
      expect(res.body.status).toBe('ACTIVE');
    });

    it('creates and approves a warranty claim', async () => {
      const claim = await request(server)
        .post('/api/service/warranty-claims')
        .set(auth())
        .send({
          claimNumber: unique('CLM-'),
          warrantyId,
          serviceRequestId: requestId,
          projectId,
          claimDate: '2026-08-04',
          issueSummary: 'Ejector pin failure within warranty',
          claimAmount: 100000,
        })
        .expect(201);
      claimId = claim.body.id;
      expect(claim.body.claimNumber).toMatch(/^CLM-/);

      const approved = await request(server)
        .patch(`/api/service/warranty-claims/${claimId}/approve`)
        .set(auth())
        .send({ eligibilityReason: 'Within coverage period' })
        .expect(200);
      expect(approved.body.id).toBe(claimId);
    });

    it('lists claims and includes the created one', async () => {
      const res = await request(server)
        .get('/api/service/warranty-claims')
        .set(auth())
        .expect(200);
      const items = Array.isArray(res.body) ? res.body : res.body.data;
      expect(items.some((c: { id: string }) => c.id === claimId)).toBe(true);
    });
  });

  describe('AMC contracts and spare parts', () => {
    it('creates an AMC contract', async () => {
      const res = await request(server)
        .post('/api/service/amc')
        .set(auth())
        .send({
          contractNumber: unique('AMC-'),
          projectId,
          coverageType: 'COMPREHENSIVE',
          contractValue: 120000,
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          visitSchedule: [{ month: 1, type: 'PM' }],
        })
        .expect(201);
      amcId = res.body.id;
      expect(res.body.contractNumber).toMatch(/^AMC-/);
    });

    it('updates the AMC contract', async () => {
      const res = await request(server)
        .patch(`/api/service/amc/${amcId}`)
        .set(auth())
        .send({ coverageType: 'PREVENTIVE' })
        .expect(200);
      expect(res.body.coverageType).toBe('PREVENTIVE');
    });

    it('lists spare parts catalog', async () => {
      const res = await request(server)
        .get('/api/service/spare-parts')
        .set(auth())
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
