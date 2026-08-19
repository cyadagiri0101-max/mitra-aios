import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { createTestApp } from './utils/test-app';

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';

describe('M4 Golden Scenario G7 — Work Order Execution with Finite Scheduling (e2e)', () => {
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
    const bEmail = `tenantb.g7.${Date.now()}@mitra.local`;
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
      [tenantBId, `M4G7${Date.now() % 100000}`],
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

  it('G7 End-to-End: Generates WO from released routing, schedules machines, enforces operation sequencing & completes cleanly', async () => {
    // Step 1: Create Project & Released Drawing
    const prjRes = await request(server)
      .post('/api/project')
      .set(auth(adminToken))
      .send({
        name: 'G7 Mold Manufacturing Project',
        customerName: 'Tier 1 Automotive Tooling',
        productName: 'Bumper Tool Cavity',
      })
      .expect(201);
    const projectId = prjRes.body.id;

    const drwRes = await request(server)
      .post('/api/engineering/drawings')
      .set(auth(adminToken))
      .send({
        projectId,
        title: 'Core Cavity Plate',
        drawingType: 'CORE',
        currentRevision: 'A',
        cadFileType: 'NX',
        cadAppName: 'Siemens NX',
        cadAppVersion: '2306',
        lengthMm: 450.0,
        widthMm: 320.0,
        heightMm: 180.0,
      })
      .expect(201);
    const drawingId = drwRes.body.id;

    // Freeze and Release Drawing
    await request(server)
      .post(`/api/engineering/releases/drawing/${drawingId}/freeze`)
      .set(auth(adminToken))
      .send({ notes: 'Locked for manufacturing' })
      .expect(201);
    await request(server)
      .post(`/api/engineering/releases/drawing/${drawingId}/release`)
      .set(auth(adminToken))
      .send({ notes: 'Released for shop floor' })
      .expect(201);

    // Step 2: Create Routing with 2 Sequential Operations & Release
    const rtgRes = await request(server)
      .post('/api/engineering/routings')
      .set(auth(adminToken))
      .send({
        projectId,
        drawingId,
        routingName: 'Cavity Machining Process',
      })
      .expect(201);
    const routingId = rtgRes.body.id;

    await request(server)
      .post(`/api/engineering/routings/${routingId}/operations`)
      .set(auth(adminToken))
      .send({
        sequence: 10,
        operationName: 'Rough CNC Milling',
        cycleTimeMinutes: 30,
      })
      .expect(201);

    await request(server)
      .post(`/api/engineering/routings/${routingId}/operations`)
      .set(auth(adminToken))
      .send({
        sequence: 20,
        operationName: 'Finish CNC Milling',
        cycleTimeMinutes: 45,
      })
      .expect(201);

    await request(server)
      .post(`/api/engineering/releases/routing/${routingId}/freeze`)
      .set(auth(adminToken))
      .send({ notes: 'Process plan frozen' })
      .expect(201);

    await request(server)
      .post(`/api/engineering/releases/routing/${routingId}/release`)
      .set(auth(adminToken))
      .send({ notes: 'Process plan released' })
      .expect(201);

    // Create Machine Master
    const machRes = await request(server)
      .post('/api/manufacturing/machines')
      .set(auth(adminToken))
      .send({
        machineNumber: unique('CNC-G7'),
        machineName: 'Makino V33i High Speed CNC',
        status: 'IDLE',
      })
      .expect(201);
    const machineId = machRes.body.id;

    // Step 3: Create Work Order Linked to Released Routing
    const woRes = await request(server)
      .post('/api/manufacturing/work-orders')
      .set(auth(adminToken))
      .send({
        projectId,
        drawingId,
        routingId,
        partName: 'Cavity Plate',
        operationType: 'CNC_MILLING',
      })
      .expect(201);
    const workOrderId = woRes.body.id;

    // Step 4: Release Work Order -> Automatically Generates Job Cards with Workflows
    const relRes = await request(server)
      .post(`/api/manufacturing/work-orders/${workOrderId}/release`)
      .set(auth(adminToken));
    if (relRes.status !== 201) {
      console.error('RELEASE WORK ORDER FAILED:', relRes.status, relRes.body);
    }
    expect(relRes.status).toBe(201);
    expect(relRes.body.status).toBe('RELEASED');

    // Retrieve the auto-generated Job Cards
    const jcListRes = await request(server)
      .get(`/api/manufacturing/work-orders/${workOrderId}/job-cards`)
      .set(auth(adminToken))
      .expect(200);

    const jobCards = jcListRes.body;
    expect(jobCards.length).toBe(2);
    const jc1 = jobCards.find((j: any) => j.operationNumber === 10);
    const jc2 = jobCards.find((j: any) => j.operationNumber === 20);
    expect(jc1).toBeDefined();
    expect(jc2).toBeDefined();

    // Step 5: Machine Scheduling & Booking Assignment
    const scheduleRes = await request(server)
      .post('/api/manufacturing/scheduling/assign')
      .set(auth(adminToken))
      .send({
        jobId: jc1.id,
        machineId,
        startDatetime: '2026-09-01T08:00:00Z',
        endDatetime: '2026-09-01T12:00:00Z',
      })
      .expect(201);
    expect(scheduleRes.body.machineId).toBe(machineId);

    // Transition Work Order to IN_PROGRESS
    await request(server)
      .post(`/api/manufacturing/work-orders/${workOrderId}/transition`)
      .set(auth(adminToken))
      .send({ transition: 'START' })
      .expect(201);

    // Step 6: Start & Complete Op 10
    await request(server)
      .post(`/api/manufacturing/job-cards/${jc1.id}/start`)
      .set(auth(adminToken))
      .send({ machineId })
      .expect(201);

    await request(server)
      .post(`/api/manufacturing/job-cards/${jc1.id}/production`)
      .set(auth(adminToken))
      .send({ qtyProduced: 1, qtyRejected: 0 })
      .expect(201);

    await request(server)
      .post(`/api/manufacturing/job-cards/${jc1.id}/transition`)
      .set(auth(adminToken))
      .send({ transition: 'COMPLETE', qtyProduced: 1 })
      .expect(201);

    // Step 7: Start & Complete Op 20
    await request(server)
      .post(`/api/manufacturing/job-cards/${jc2.id}/start`)
      .set(auth(adminToken))
      .send({ machineId })
      .expect(201);

    await request(server)
      .post(`/api/manufacturing/job-cards/${jc2.id}/production`)
      .set(auth(adminToken))
      .send({ qtyProduced: 1, qtyRejected: 0 })
      .expect(201);

    await request(server)
      .post(`/api/manufacturing/job-cards/${jc2.id}/transition`)
      .set(auth(adminToken))
      .send({ transition: 'COMPLETE', qtyProduced: 1 })
      .expect(201);

    // Step 8: Verify Work Order Auto-Completed via Shop Floor Roll-Up
    const woFinalRes = await request(server)
      .get(`/api/manufacturing/work-orders/${workOrderId}`)
      .set(auth(adminToken))
      .expect(200);
    expect(woFinalRes.body.status).toBe('COMPLETED');
    expect(Number(woFinalRes.body.completedQty)).toBeGreaterThanOrEqual(2);

    // Step 9: Multi-Tenant Isolation
    await request(server)
      .get(`/api/manufacturing/work-orders/${workOrderId}`)
      .set(auth(tenantBToken))
      .expect(404);
  });
});
