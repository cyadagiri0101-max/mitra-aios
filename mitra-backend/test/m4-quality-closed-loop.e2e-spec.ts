import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { createTestApp } from './utils/test-app';

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';

describe('M4 Golden Scenario G8 — In-Process Inspection → NCR → CAPA Closed Loop (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let ds: DataSource;
  let adminToken: string;
  let tenantBToken: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const unique = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    server = app.getHttpServer();
    ds = app.get(DataSource);

    // 1. Authenticate Tenant A Admin
    const loginRes = await request(server)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = loginRes.body.access_token;

    // 2. Register & Authenticate Tenant B User
    const bEmail = `tenantb.g8.${Date.now()}@mitra.local`;
    const bPassword = 'EngTenantB!2026';
    await request(server)
      .post('/api/auth/register')
      .set(auth(adminToken))
      .send({ email: bEmail, password: bPassword, firstName: 'Tenant', lastName: 'TenantB' })
      .expect(201);

    const bLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: bEmail, password: bPassword })
      .expect(200);
    const bUser = await request(server).get('/api/auth/me').set(auth(bLogin.body.access_token)).expect(200);
    const roles = await request(server).get('/api/roles').set(auth(adminToken)).expect(200);
    const adminRole = roles.body.find((r: { name: string }) => r.name === 'ADMIN');
    if (adminRole) {
      await request(server)
        .post(`/api/users/${bUser.body.id}/assign-role`)
        .set(auth(adminToken))
        .send({ roleId: adminRole.id, reason: 'M4 e2e fixture' })
        .expect(200);
    }

    const tenantBId = randomUUID();
    await ds.query(
      `INSERT INTO tenants (id, name, code, is_active, created_at, updated_at)
       VALUES ($1, 'M4 Tenant B', $2, true, now(), now())`,
      [tenantBId, `M4G8${Date.now() % 100000}`],
    );
    await ds.query(`UPDATE users SET tenant_id = $1 WHERE id = $2`, [tenantBId, bUser.body.id]);

    const bLoginRefreshed = await request(server)
      .post('/api/auth/login')
      .send({ email: bEmail, password: bPassword })
      .expect(200);
    tenantBToken = bLoginRefreshed.body.access_token;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('G8 End-to-End: In-process inspection failure blocks WO completion until CAPA verified & NCR closed', async () => {
    // Step 1: Create Project & Released Drawing
    const prjRes = await request(server)
      .post('/api/project')
      .set(auth(adminToken))
      .send({
        name: 'G8 Precision Mold Project',
        customerName: 'Medical Devices Corp',
        productName: 'Syringe Plunger Mold Plate',
      })
      .expect(201);
    const projectId = prjRes.body.id;

    const drwRes = await request(server)
      .post('/api/engineering/drawings')
      .set(auth(adminToken))
      .send({
        projectId,
        title: 'Core Ejector Retainer',
        drawingType: 'CORE',
        currentRevision: 'A',
        cadFileType: 'NX',
        cadAppName: 'Siemens NX',
        cadAppVersion: '2306',
        lengthMm: 350.0,
        widthMm: 220.0,
        heightMm: 120.0,
      })
      .expect(201);
    const drawingId = drwRes.body.id;

    await request(server)
      .post(`/api/engineering/releases/drawing/${drawingId}/freeze`)
      .set(auth(adminToken))
      .send({ notes: 'Locked for mold manufacturing' })
      .expect(201);
    await request(server)
      .post(`/api/engineering/releases/drawing/${drawingId}/release`)
      .set(auth(adminToken))
      .send({ notes: 'Released for shop floor' })
      .expect(201);

    // Step 2: Create and Release Work Order
    const woRes = await request(server)
      .post('/api/manufacturing/work-orders')
      .set(auth(adminToken))
      .send({
        projectId,
        drawingId,
        partName: 'Retainer Plate',
        operationType: 'PRECISION_BORING',
      })
      .expect(201);
    const workOrderId = woRes.body.id;

    await request(server)
      .post(`/api/manufacturing/work-orders/${workOrderId}/release`)
      .set(auth(adminToken))
      .expect(201);

    // Create a job card and complete it
    const jcId = randomUUID();
    await ds.query(
      `INSERT INTO job_cards (id, job_card_number, work_order_id, operation_number, operation_code, status, tenant_id, created_by, updated_by, created_at, updated_at)
       VALUES ($1, $2, $3, 10, 'OP10-BORING', 'COMPLETED', (SELECT tenant_id FROM work_orders WHERE id = $3), (SELECT created_by FROM work_orders WHERE id = $3), (SELECT created_by FROM work_orders WHERE id = $3), now(), now())`,
      [jcId, unique('JC-G8'), workOrderId],
    );

    // Step 3: Start Work Order (IN_PROGRESS)
    await request(server)
      .post(`/api/manufacturing/work-orders/${workOrderId}/transition`)
      .set(auth(adminToken))
      .send({ transition: 'START' })
      .expect(201);

    // Step 4: Raise Critical NCR representing in-process checkpoint failure
    const ncrRes = await request(server)
      .post('/api/quality/ncr')
      .set(auth(adminToken))
      .send({
        workOrderId,
        projectId,
        drawingId,
        ncrType: 'INTERNAL',
        severity: 'CRITICAL',
        description: 'Ejector pin bore diameter out of tolerance (measured 12.08mm vs 12.00 +/- 0.02mm)',
        detectedQty: 1,
        rejectedQty: 1,
        status: 'OPEN',
      })
      .expect(201);
    const ncrId = ncrRes.body.id;
    expect(ncrRes.body.severity).toBe('CRITICAL');
    expect(ncrRes.body.status).toBe('OPEN');

    // Step 5: Attempt Work Order Completion -> MUST BE BLOCKED BY QUALITY GATE (HTTP 400)
    const blockedRes = await request(server)
      .post(`/api/manufacturing/work-orders/${workOrderId}/transition`)
      .set(auth(adminToken))
      .send({ transition: 'COMPLETE' })
      .expect(400);
    expect(blockedRes.body.message).toContain('unresolved CRITICAL NCR');

    // Step 6: Escalate NCR to CAPA
    const capaEscRes = await request(server)
      .post(`/api/quality/ncr/${ncrId}/escalate-capa`)
      .set(auth(adminToken))
      .send({
        problemDescription: 'Bore diameter oversize due to tool wear on boring bar',
        rootCause: 'Boring bar insert exceeded tool wear life limit',
        rootCauseMethod: '5_WHY',
        correctiveAction: 'Replace boring insert and recalibrate tool offset',
        preventiveAction: 'Implement automated tool wear tracking and insert replacement schedule',
      })
      .expect(201);
    const capaId = capaEscRes.body.capa.id;
    expect(capaEscRes.body.capa.ncrId).toBe(ncrId);
    expect(capaEscRes.body.ncr.status).toBe('ACTION');

    // Step 6: Advance CAPA through Root Cause, Implementation & Verification
    await request(server)
      .patch(`/api/capa/${capaId}/transition`)
      .set(auth(adminToken))
      .send({ toStatus: 'IN_PROGRESS' })
      .expect(200);

    await request(server)
      .patch(`/api/capa/${capaId}/transition`)
      .set(auth(adminToken))
      .send({
        toStatus: 'IMPLEMENTED',
        correctiveAction: 'Reamed bore with new precision carbide insert and verified 12.01mm on CMM',
      })
      .expect(200);

    await request(server)
      .patch(`/api/capa/${capaId}/transition`)
      .set(auth(adminToken))
      .send({
        toStatus: 'VERIFIED',
        verificationEvidence: 'CMM report #CMM-2026-0819 confirms bore diameter at 12.008mm within tolerance',
      })
      .expect(200);

    // Close CAPA -> Automatically closes the linked NCR
    await request(server)
      .patch(`/api/capa/${capaId}/transition`)
      .set(auth(adminToken))
      .send({ toStatus: 'CLOSED' })
      .expect(200);

    // Verify NCR is now CLOSED
    const checkNcr = await request(server)
      .get(`/api/quality/ncr/${ncrId}`)
      .set(auth(adminToken))
      .expect(200);
    expect(checkNcr.body.status).toBe('CLOSED');

    // Step 7: Now Work Order Completion MUST SUCCEED (Quality Gate Cleared)
    const completeRes = await request(server)
      .post(`/api/manufacturing/work-orders/${workOrderId}/transition`)
      .set(auth(adminToken))
      .send({ transition: 'COMPLETE' })
      .expect(201);
    expect(completeRes.body.status).toBe('COMPLETED');

    // Step 8: Multi-Tenant Isolation
    await request(server)
      .get(`/api/quality/ncr/${ncrId}`)
      .set(auth(tenantBToken))
      .expect(404);
    await request(server)
      .get(`/api/capa/${capaId}`)
      .set(auth(tenantBToken))
      .expect(404);
  });
});
