import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

jest.setTimeout(300000);

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';
const unique = (p: string) => `${p}-${Date.now()}`;

describe('M3 Golden Scenario G4 — Engineering Design Release & Manufacturing Gate (E2E)', () => {
  let app: INestApplication;
  let server: any;
  let ds: DataSource;
  let adminToken: string;
  let tenantA: string;
  let bToken: string;
  let tenantB: string;
  let testProjectId: string;
  let testDrawingId: string;
  let testBomId: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    ({ app } = await createTestApp());
    server = app.getHttpServer();
    ds = app.get(DataSource);

    // Seed M3 permissions into permissions table if not already present
    const permissions: Array<[string, string, string]> = [
      ['engineering', 'drawing:create', 'Create drawing'],
      ['engineering', 'drawing:read', 'Read drawing'],
      ['engineering', 'drawing:update', 'Update drawing'],
      ['engineering', 'drawing:checkout', 'Checkout drawing'],
      ['engineering', 'drawing:checkin', 'Checkin drawing'],
      ['engineering', 'drawing:compare', 'Compare drawings'],
      ['engineering', 'bom:create', 'Create BOM'],
      ['engineering', 'bom:read', 'Read BOM'],
      ['engineering', 'bom:rollup', 'BOM cost rollup'],
      ['engineering', 'bom:compare', 'Compare BOMs'],
      ['engineering', 'review:read', 'Read reviews'],
      ['engineering', 'review:create', 'Create review'],
      ['engineering', 'review:assign', 'Assign review'],
      ['engineering', 'review:comment', 'Comment review'],
      ['engineering', 'review:decide', 'Decide review'],
      ['engineering', 'release_freeze', 'Freeze release'],
      ['engineering', 'release_approve', 'Approve release'],
      ['manufacturing', 'workorder:create', 'Create workorder'],
      ['manufacturing', 'workorder:read', 'Read workorder'],
    ];

    for (const [resource, action, desc] of permissions) {
      await ds.query(
        `INSERT INTO permissions (resource, action, description) VALUES ($1, $2, $3)
         ON CONFLICT (resource, action) DO NOTHING`,
        [resource, action, desc],
      );
    }

    await ds.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name IN ('ADMIN', 'MANAGEMENT')
        AND p.resource IN ('engineering', 'manufacturing')
      ON CONFLICT DO NOTHING;
    `);

    // ── TENANT A ──
    const adminLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = adminLogin.body.access_token;
    const adminMe = await request(server).get('/api/auth/me').set(auth(adminToken)).expect(200);
    tenantA = adminMe.body.tenantId;

    // ── TENANT B fixture ──
    const bEmail = `eng.b.${Date.now()}@mitra.local`;
    const bPassword = 'EngTenantB!2026';
    await request(server)
      .post('/api/auth/register')
      .set(auth(adminToken))
      .send({ email: bEmail, password: bPassword, firstName: 'Eng', lastName: 'TenantB' })
      .expect(201);
    const bLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: bEmail, password: bPassword })
      .expect(200);
    const bUser = await request(server).get('/api/auth/me').set(auth(bLogin.body.access_token)).expect(200);
    const roles = await request(server).get('/api/roles').set(auth(adminToken)).expect(200);
    const adminRole = roles.body.find((r: { name: string }) => r.name === 'ADMIN');
    await request(server)
      .post(`/api/users/${bUser.body.id}/assign-role`)
      .set(auth(adminToken))
      .send({ roleId: adminRole.id, reason: 'M3 e2e fixture' })
      .expect(200);

    const tenantBId = randomUUID();
    await ds.query(
      `INSERT INTO tenants (id, name, code, is_active, created_at, updated_at)
       VALUES ($1, 'M3 Engineering Tenant B', $2, true, now(), now())`,
      [tenantBId, `M3ENG${Date.now() % 100000}`],
    );
    await ds.query(`UPDATE users SET tenant_id = $1 WHERE id = $2`, [tenantBId, bUser.body.id]);

    const bLoginRefreshed = await request(server)
      .post('/api/auth/login')
      .send({ email: bEmail, password: bPassword })
      .expect(200);
    bToken = bLoginRefreshed.body.access_token;
    tenantB = tenantBId;

    // Seed test project in Tenant A
    const projRes = await request(server)
      .post('/api/project')
      .set(auth(adminToken))
      .send({
        name: 'Automotive Bumper Injection Mold Tooling',
        customerName: 'Global Auto Tier 1',
        productName: 'Front Bumper Fascia Tool',
      })
      .expect(201);
    testProjectId = projRes.body.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('1. Engineering Drawing Registration & Check-in', () => {
    it('should create an engineering drawing in DRAFT status', async () => {
      const res = await request(server)
        .post('/api/engineering/drawings')
        .set(auth(adminToken))
        .send({
          projectId: testProjectId,
          title: 'Core Insert 3D CAD Drawing',
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

      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('DRAFT');
      expect(res.body.currentRevision).toBe('A');
      testDrawingId = res.body.id;
    });

    it('should check out and check in drawing with revision update', async () => {
      // Checkout
      await request(server)
        .post(`/api/engineering/drawings/${testDrawingId}/checkout`)
        .set(auth(adminToken))
        .send({ checkedOutByName: 'Lead CAD Engineer' })
        .expect(201);

      // Checkin
      const checkinRes = await request(server)
        .post(`/api/engineering/drawings/${testDrawingId}/revisions`)
        .set(auth(adminToken))
        .send({
          revision: 'A',
          changeSummary: 'Added runner system and cooling channel layout',
          fileName: 'Core_Insert_RevA.prt',
          fileChecksum: 'sha256:abc123mockchecksum',
          fileSizeBytes: 45000000,
        })
        .expect(201);

      expect(checkinRes.body.revision.revision).toBe('A');
      expect(checkinRes.body.drawing.checkedOutBy).toBeNull();
    });
  });

  describe('2. Design Freeze & Release Governance Gate', () => {
    it('should freeze drawing design artifact prior to formal approval', async () => {
      const freezeRes = await request(server)
        .post(`/api/engineering/releases/drawing/${testDrawingId}/freeze`)
        .set(auth(adminToken))
        .send({ notes: 'Design locked for toolpath generation and CMM inspection planning' })
        .expect(201);

      expect(freezeRes.body.status).toBe('FROZEN');

      const certRes = await request(server)
        .get(`/api/engineering/releases/drawing/${testDrawingId}`)
        .set(auth(adminToken))
        .expect(200);

      expect(certRes.body.isFrozen).toBe(true);
      expect(certRes.body.manufacturingReady).toBe(false);
    });

    it('should BLOCK work order creation against non-released (FROZEN) drawing', async () => {
      const woRes = await request(server)
        .post('/api/manufacturing/work-orders')
        .set(auth(adminToken))
        .send({
          projectId: testProjectId,
          partName: 'Core Insert Tooling Plate',
          drawingId: testDrawingId,
          operationType: 'CNC_MILLING',
        })
        .expect(400);

      expect(woRes.body.message).toContain('must be RELEASED before use in a work order');
    });

    it('should formally release drawing via release governance endpoint', async () => {
      const releaseRes = await request(server)
        .post(`/api/engineering/releases/drawing/${testDrawingId}/release`)
        .set(auth(adminToken))
        .send({ notes: 'Tool design approved for manufacturing release' })
        .expect(201);

      expect(releaseRes.body.status).toBe('RELEASED');
      expect(releaseRes.body.releasedAt).toBeDefined();

      const cert = await request(server)
        .get(`/api/engineering/releases/drawing/${testDrawingId}`)
        .set(auth(adminToken))
        .expect(200);

      expect(cert.body.status).toBe('RELEASED');
      expect(cert.body.manufacturingReady).toBe(true);
    });

    it('should ALLOW work order creation against RELEASED drawing', async () => {
      const woRes = await request(server)
        .post('/api/manufacturing/work-orders')
        .set(auth(adminToken))
        .send({
          projectId: testProjectId,
          partName: 'Core Insert Tooling Plate',
          drawingId: testDrawingId,
          operationType: 'CNC_MILLING',
        })
        .expect(201);

      expect(woRes.body.id).toBeDefined();
      expect(woRes.body.drawingId).toBe(testDrawingId);
    });
  });

  describe('3. Tenant Isolation', () => {
    it('should block Tenant B from accessing or releasing Tenant A drawings', async () => {
      await request(server)
        .get(`/api/engineering/drawings/${testDrawingId}`)
        .set(auth(bToken))
        .expect(404);

      await request(server)
        .post(`/api/engineering/releases/drawing/${testDrawingId}/release`)
        .set(auth(bToken))
        .send({ notes: 'Unauthorized attempt' })
        .expect(404);
    });
  });
});
