import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

jest.setTimeout(300000);

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';
const unique = (p: string) => `${p}-${Date.now()}`;

describe('M3 Change Decision Traceability & ECR-ECO-ECN Lifecycle (E2E)', () => {
  let app: INestApplication;
  let server: any;
  let ds: DataSource;
  let adminToken: string;
  let testProjectId: string;
  let testDecisionId: string;
  let testEcrId: string;
  let testEcoId: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    ({ app } = await createTestApp());
    server = app.getHttpServer();
    ds = app.get(DataSource);

    // ── TENANT A ──
    const adminLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = adminLogin.body.access_token;

    // Seed test project in Tenant A
    const projRes = await request(server)
      .post('/api/project')
      .set(auth(adminToken))
      .send({
        name: 'Automotive Connector Tooling ECR Project',
        customerName: 'Electric Vehicle Corp',
        productName: 'High Voltage Connector Mold',
      })
      .expect(201);
    testProjectId = projRes.body.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('1. Engineering Decision Log Creation', () => {
    it('should create an engineering decision evaluating tool modification options', async () => {
      const decRes = await request(server)
        .post('/api/engineering-decisions')
        .set(auth(adminToken))
        .send({
          projectId: testProjectId,
          title: 'Core Insert Gate Dimension Revision',
          decisionType: 'ENGINEERING_CHANGE',
          optionsConsidered: 'Option A: EDM spark erosion to widen gate by 0.5mm; Option B: Full insert replacement',
          selectedOption: 'Option A: EDM spark erosion with stress relief cycle',
          rationale: 'Reduces lead time by 12 days and saves $3,200 tooling cost while resolving sink mark defect',
          decision: 'Proceed with EDM gate modification under ECR',
        })
        .expect(201);

      expect(decRes.body.id).toBeDefined();
      expect(decRes.body.decisionNumber).toMatch(/^DEC-\d{4}-\d{4}$/);
      testDecisionId = decRes.body.id;
    });
  });

  describe('2. ECR Creation & Decision Log Linking', () => {
    it('should create ECR and link to the Engineering Decision', async () => {
      const ecrRes = await request(server)
        .post('/api/engineering-changes/ecr')
        .set(auth(adminToken))
        .send({
          projectId: testProjectId,
          title: 'Gate Geometry Enlargement for Sink Mark Elimination',
          changeDescription: 'Increase sub-gate depth from 1.2mm to 1.7mm on cavities 1-4',
          changeReason: 'Customer quality trial observed 0.08mm sink mark near living hinge',
          changeType: 'TOOLING',
          priority: 'HIGH',
        })
        .expect(201);

      testEcrId = ecrRes.body.id;
      expect(testEcrId).toBeDefined();
      expect(ecrRes.body.ecrNumber).toMatch(/^ECR-\d{4}-\d{4}$/);

      // Link Decision
      const linkRes = await request(server)
        .post(`/api/engineering-changes/ecr/${testEcrId}/link-decision`)
        .set(auth(adminToken))
        .send({ decisionId: testDecisionId })
        .expect(200);

      expect(linkRes.body.decisionId).toBe(testDecisionId);
    });

    it('should add change impact analysis entries to the ECR', async () => {
      const impactRes = await request(server)
        .post(`/api/engineering-changes/ecr/${testEcrId}/impacts`)
        .set(auth(adminToken))
        .send({
          impactType: 'DRAWING',
          entityId: testProjectId,
          impactDescription: 'Update Core Insert 3D model and 2D manufacturing prints',
          severity: 'HIGH',
          disposition: 'MODIFY',
        })
        .expect(201);

      expect(impactRes.body.id).toBeDefined();
      expect(impactRes.body.ecrId).toBe(testEcrId);
    });
  });

  describe('3. ECO & ECN Manufacturing Notification', () => {
    it('should generate ECO from the ECR', async () => {
      const ecoRes = await request(server)
        .post('/api/engineering-changes/eco')
        .set(auth(adminToken))
        .send({
          ecrId: testEcrId,
          projectId: testProjectId,
          implementationPlan: '1. CNC EDM electrode fabrication; 2. Spark cavity inserts; 3. Dimensional CMM inspection; 4. Mold trial T1',
        })
        .expect(201);

      testEcoId = ecoRes.body.id;
      expect(testEcoId).toBeDefined();
      expect(ecoRes.body.ecoNumber).toMatch(/^ECO-\d{4}-\d{4}$/);
    });

    it('should issue ECN from ECO to notify manufacturing', async () => {
      const ecnRes = await request(server)
        .post(`/api/engineering-changes/eco/${testEcoId}/ecn`)
        .set(auth(adminToken))
        .send({
          title: 'Tooling Modification Notice — Gate Width Revision',
          changeSummary: 'EDM work order scheduled on Makino CNC EDM workstation',
          effectiveDate: new Date().toISOString().split('T')[0],
        })
        .expect(201);

      expect(ecnRes.body.id).toBeDefined();
      expect(ecnRes.body.ecnNumber).toMatch(/^ECN-\d{4}-\d{4}$/);
      expect(ecnRes.body.status).toBe('ISSUED');
    });
  });
});
