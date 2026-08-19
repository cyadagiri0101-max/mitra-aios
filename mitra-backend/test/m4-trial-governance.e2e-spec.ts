import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { createTestApp } from './utils/test-app';

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';

describe('M4 Golden Scenario G9 — Tooling Trial Run → Results → Retrial & ECR Governance (e2e)', () => {
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
    const bEmail = `tenantb.g9.${Date.now()}@mitra.local`;
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
      [tenantBId, `M4G9${Date.now() % 100000}`],
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

  it('G9 End-to-End: Tooling trial T0 failure triggers governed Retrial T1 and generates linked ECR', async () => {
    // Step 1: Create Project & Released Drawing
    const prjRes = await request(server)
      .post('/api/project')
      .set(auth(adminToken))
      .send({
        name: 'G9 Injection Mold Validation',
        customerName: 'Consumer Packaging Corp',
        productName: 'Shampoo Bottle 500ml Mold',
      })
      .expect(201);
    const projectId = prjRes.body.id;

    const drwRes = await request(server)
      .post('/api/engineering/drawings')
      .set(auth(adminToken))
      .send({
        projectId,
        title: 'Shampoo Bottle 500ml 4-Cavity Mold',
        drawingType: 'CORE',
        currentRevision: 'A',
        cadFileType: 'NX',
        cadAppName: 'Siemens NX',
        cadAppVersion: '2306',
        lengthMm: 600.0,
        widthMm: 450.0,
        heightMm: 350.0,
      })
      .expect(201);
    const drawingId = drwRes.body.id;

    await request(server)
      .post(`/api/engineering/releases/drawing/${drawingId}/freeze`)
      .set(auth(adminToken))
      .send({ notes: 'Locked for mold validation' })
      .expect(201);
    await request(server)
      .post(`/api/engineering/releases/drawing/${drawingId}/release`)
      .set(auth(adminToken))
      .send({ notes: 'Released for shop floor trial' })
      .expect(201);

    // Step 2: Record Tooling Trial T0 with Process Parameters
    const trialRes = await request(server)
      .post('/api/quality/trials')
      .set(auth(adminToken))
      .send({
        projectId,
        drawingId,
        trialType: 'INTERNAL',
        trialDate: '2026-09-01T08:00:00.000Z',
        shift: 'SHIFT_1',
        moldTemperatureC: 45.0,
        materialTemperatureC: 230.0,
        injectionPressureBar: 140.0,
        cycleTimeSeconds: 22.5,
        shotsTaken: 50,
        goodParts: 35,
        rejectedParts: 15,
        observations: 'Flash observed along parting line near gate; slight sink mark on handle rib',
        correctiveActions: 'Adjust clamping force and modify cavity relief angle by 0.5 degrees',
        result: 'FAIL',
      })
      .expect(201);
    const trialId = trialRes.body.id;
    expect(trialRes.body.result).toBe('FAIL');
    expect(trialRes.body.trialSequence).toBe(1);

    // Step 3: Request Governed Retrial T1
    const retrialRes = await request(server)
      .post(`/api/quality/trials/${trialId}/request-retrial`)
      .set(auth(adminToken))
      .send({
        retrialReason: 'Parting line flash remediation and cooling channel flow optimization',
        changesMade: 'Relieved cavity edges, polished gate, increased chilling cycle',
        scheduledDate: '2026-09-05',
      })
      .expect(201);
    const retrialId = retrialRes.body.id;
    expect(retrialRes.body.retrialSequence).toBe(2);
    expect(retrialRes.body.originalTrialId).toBe(trialId);
    expect(retrialRes.body.status).toBe('SCHEDULED');

    // Step 4: Human Approval of Retrial
    const approveRes = await request(server)
      .post(`/api/quality/trials/retrials/${retrialId}/approve`)
      .set(auth(adminToken))
      .send({ remarks: 'Toolroom modification verified on optical comparator' })
      .expect(201);
    expect(approveRes.body.status).toBe('APPROVED');

    // Step 5: Automatically Create Tooling Change Request (ECR) from Failed Trial Defect Telemetry
    const ecrRes = await request(server)
      .post(`/api/quality/trials/${trialId}/create-ecr`)
      .set(auth(adminToken))
      .send({
        title: 'Tooling Rework: Parting Line Flash Relief',
        reason: 'Trial T0 flash defect remediation on bottle handle',
        priority: 'HIGH',
      })
      .expect(201);
    expect(ecrRes.body.title).toContain('Tooling Rework');
    expect(ecrRes.body.change_type || ecrRes.body.changeType).toBe('TOOLING');
    expect(ecrRes.body.status).toBe('DRAFT');

    // Step 6: Multi-Tenant Isolation
    await request(server)
      .get(`/api/quality/trials/${trialId}`)
      .set(auth(tenantBToken))
      .expect(404);
  });
});
