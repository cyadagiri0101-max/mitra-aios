import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

jest.setTimeout(300000);

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';
const unique = (p: string) => `${p}-${Date.now()}`;

describe('M2 Sprint 2 — Project Planning, Baselines & Capacity Intelligence (E2E)', () => {
  let app: INestApplication;
  let server: any;
  let ds: DataSource;
  let adminToken: string;
  let tenantA: string;
  let bToken: string;
  let tenantB: string;
  let testProjectId: string;
  let baseline1Id: string;
  let baseline2Id: string;
  let designingTaskId: string;
  let detailingTaskId: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    ({ app } = await createTestApp());
    server = app.getHttpServer();
    ds = app.get(DataSource);

    // Ensure M2 Sprint 2 permissions exist and are linked to ADMIN role in test DB before login
    const permissions: Array<[string, string]> = [
      ['baseline', 'read'],
      ['baseline', 'create'],
      ['baseline', 'update'],
      ['baseline', 'activate'],
      ['baseline', 'compare'],
      ['baseline', 'delete'],
      ['capacity', 'read'],
      ['capacity', 'simulate'],
      ['design_load', 'read'],
      ['design_load', 'create'],
      ['design_system', 'read'],
      ['design_system', 'create'],
    ];

    for (const [resource, action] of permissions) {
      await ds.query(
        `INSERT INTO permissions (resource, action) VALUES ($1, $2) ON CONFLICT (resource, action) DO NOTHING`,
        [resource, action],
      );
    }

    await ds.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name IN ('ADMIN', 'MANAGEMENT')
        AND p.resource IN ('baseline', 'capacity', 'design_load', 'design_system')
      ON CONFLICT DO NOTHING;
    `);

    // ── TENANT A (admin) ───────────────────────────────────────────────
    const adminLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = adminLogin.body.access_token;
    const adminMe = await request(server).get('/api/auth/me').set(auth(adminToken)).expect(200);
    tenantA = adminMe.body.tenantId;

    // ── TENANT B fixture ───────────────────────────────────────────────
    const bEmail = `baseline.b.${Date.now()}@mitra.local`;
    const bPassword = 'BaselineB!2026';
    await request(server)
      .post('/api/auth/register')
      .set(auth(adminToken))
      .send({ email: bEmail, password: bPassword, firstName: 'Baseline', lastName: 'TenantB' })
      .expect(201);
    const bLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: bEmail, password: bPassword })
      .expect(200);
    const bUser = await request(server).get('/api/auth/me').set(auth(bLogin.body.access_token)).expect(200);
    const roles = await request(server).get('/api/roles').set(auth(adminToken)).expect(200);
    const adminRole = roles.body.find((r: { name: string }) => r.name === 'ADMIN');
    expect(adminRole).toBeDefined();
    await request(server)
      .post(`/api/users/${bUser.body.id}/assign-role`)
      .set(auth(adminToken))
      .send({ roleId: adminRole.id, reason: 'M2 Sprint 2 e2e fixture' })
      .expect(200);

    const tenantBId = randomUUID();
    await ds.query(
      `INSERT INTO tenants (id, name, code, is_active, created_at, updated_at)
       VALUES ($1, 'M2 Baseline Tenant B', $2, true, now(), now())`,
      [tenantBId, `M2BL${Date.now() % 100000}`],
    );
    await ds.query(`UPDATE users SET tenant_id = $1 WHERE id = $2`, [tenantBId, bUser.body.id]);

    const bLoginRefreshed = await request(server)
      .post('/api/auth/login')
      .send({ email: bEmail, password: bPassword })
      .expect(200);
    bToken = bLoginRefreshed.body.access_token;
    tenantB = tenantBId;

    // Seed 10 Workstations for Tenant A if not present
    const existingWs = await ds.query(`SELECT count(*) FROM design_systems WHERE tenant_id = $1`, [tenantA]);
    if (parseInt(existingWs[0].count, 10) === 0) {
      for (let i = 1; i <= 10; i++) {
        await ds.query(
          `INSERT INTO design_systems (tenant_id, system_code, name, specifications, software_licenses, shift_1_available, shift_2_available, shift_3_available, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, true, true, true, 'ACTIVE', now(), now())`,
          [tenantA, `CAD-WS-${String(i).padStart(2, '0')}`, `CAD Station ${i}`, '64GB RAM, RTX 4080', 'NX CAD 2306'],
        );
      }
    }

    // Seed 1 Design Engineer for Tenant A if not present
    const existingEmp = await ds.query(`SELECT count(*) FROM employees WHERE tenant_id = $1 AND department = 'DESIGN'`, [tenantA]);
    if (parseInt(existingEmp[0].count, 10) === 0) {
      await ds.query(
        `INSERT INTO employees (tenant_id, employee_code, first_name, last_name, email, department, designation, status, created_at, updated_at)
         VALUES ($1, 'ENG-BL-01', 'Lead', 'Designer', 'designer.bl@mitra.local', 'DESIGN', 'Lead Engineer', 'ACTIVE', now(), now())`,
        [tenantA],
      );
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GOLDEN SCENARIO G2 — Project Planning with Baselines & Variance Lifecycle
  // ══════════════════════════════════════════════════════════════════════════
  describe('Golden Scenario G2 — Schedule Baselines & Variance Lifecycle', () => {
    it('Step 1: Create project for baseline lifecycle testing', async () => {
      const projRes = await request(server)
        .post('/api/project')
        .set(auth(adminToken))
        .send({
          name: unique('M2 Mold Project'),
          customerName: 'Acme Corporation',
          productName: 'Connector Mold',
          description: 'M2 Baseline Test Project',
          projectType: 'NEW_DEVELOPMENT',
          moldType: 'INJECTION',
          startDate: '2026-09-01',
          plannedEndDate: '2026-09-30',
        })
        .expect(201);

      testProjectId = projRes.body.id;
      expect(testProjectId).toBeDefined();
    });

    it('Step 2: Create milestones and tasks representing initial plan', async () => {
      // Milestone
      const msRes = await request(server)
        .post(`/api/project/${testProjectId}/milestones`)
        .set(auth(adminToken))
        .send({
          milestoneName: 'Design Complete',
          milestoneStage: 'DESIGN',
          plannedDate: '2026-09-10',
          sequenceNumber: 1,
          isCriticalPath: true,
        });
      expect([200, 201]).toContain(msRes.status);

      // Task 1: Mold Development (2 days, 16h)
      await request(server)
        .post(`/api/project/${testProjectId}/tasks`)
        .set(auth(adminToken))
        .send({
          title: 'Mold Development',
          startDate: '2026-09-01',
          dueDate: '2026-09-03',
          estimatedHours: 16,
        });

      // Task 2: Designing (4 days, 32h)
      const t2 = await request(server)
        .post(`/api/project/${testProjectId}/tasks`)
        .set(auth(adminToken))
        .send({
          title: 'Designing',
          startDate: '2026-09-03',
          dueDate: '2026-09-07',
          estimatedHours: 32,
        });
      designingTaskId = t2.body.id;

      // Task 3: Detailing (3 days, 24h)
      const t3 = await request(server)
        .post(`/api/project/${testProjectId}/tasks`)
        .set(auth(adminToken))
        .send({
          title: 'Detailing',
          startDate: '2026-09-07',
          dueDate: '2026-09-10',
          estimatedHours: 24,
        });
      detailingTaskId = t3.body.id;
    });

    it('Step 3: Create initial schedule baseline BL-0001 snapshot', async () => {
      const baseRes = await request(server)
        .post(`/api/project/${testProjectId}/baselines`)
        .set(auth(adminToken))
        .send({
          name: 'Initial Customer Approved Baseline',
          description: 'Kickoff schedule committed to client',
          reason: 'Project Kickoff',
          effectiveDate: '2026-09-01',
        });

      expect(baseRes.status).toBe(201);
      expect(baseRes.body.baselineNumber).toBe('BL-0001');
      expect(baseRes.body.version).toBe(1);
      expect(baseRes.body.status).toBe('DRAFT');
      expect(baseRes.body.items.length).toBeGreaterThanOrEqual(3);
      baseline1Id = baseRes.body.id;
    });

    it('Step 4: Activate baseline BL-0001 and verify lock', async () => {
      const actRes = await request(server)
        .post(`/api/project/${testProjectId}/baselines/${baseline1Id}/activate`)
        .set(auth(adminToken));

      expect(actRes.status).toBe(200);
      expect(actRes.body.status).toBe('ACTIVE');
      expect(actRes.body.isLocked).toBe(true);
      expect(actRes.body.activatedAt).toBeDefined();
    });

    it('Step 5: Modify live schedule (Designing +1 day, Detailing +1 day)', async () => {
      // Modify Designing task: 4 days -> 5 days (due 2026-09-08, 40h)
      await request(server)
        .patch(`/api/project/${testProjectId}/tasks/${designingTaskId}`)
        .set(auth(adminToken))
        .send({
          dueDate: '2026-09-08',
          estimatedHours: 40,
        });

      // Modify Detailing task: 3 days -> 4 days (start 2026-09-08, due 2026-09-12, 32h)
      await request(server)
        .patch(`/api/project/${testProjectId}/tasks/${detailingTaskId}`)
        .set(auth(adminToken))
        .send({
          startDate: '2026-09-08',
          dueDate: '2026-09-12',
          estimatedHours: 32,
        });
    });

    it('Step 6: Calculate variance and verify deterministic explanation', async () => {
      const varRes = await request(server)
        .get(`/api/project/${testProjectId}/baselines/variance`)
        .set(auth(adminToken));

      expect(varRes.status).toBe(200);
      expect(varRes.body.baselineNumber).toBe('BL-0001');
      expect(varRes.body.overallScheduleVarianceDays).toBe(2); // +1d + +1d = +2d
      expect(varRes.body.overallHoursVariance).toBe(16); // +8h + +8h = +16h
      expect(varRes.body.isBehindSchedule).toBe(true);
      expect(varRes.body.explanation).toContain('BL-0001');
      expect(varRes.body.taskVariances.length).toBeGreaterThan(0);

      const designTaskVar = varRes.body.taskVariances.find((t: any) => t.title === 'Designing');
      expect(designTaskVar).toBeDefined();
      expect(designTaskVar.durationVarianceDays).toBe(1);
      expect(designTaskVar.hoursVariance).toBe(8);
    });

    it('Step 7 & 8: Create and activate BL-0002; verify BL-0001 becomes SUPERSEDED', async () => {
      // Create BL-0002
      const base2Res = await request(server)
        .post(`/api/project/${testProjectId}/baselines`)
        .set(auth(adminToken))
        .send({
          name: 'Revised Scope Baseline v2',
          reason: 'Client requested tooling complexity revision',
        });
      expect(base2Res.status).toBe(201);
      expect(base2Res.body.baselineNumber).toBe('BL-0002');
      expect(base2Res.body.version).toBe(2);
      baseline2Id = base2Res.body.id;

      // Activate BL-0002
      const act2Res = await request(server)
        .post(`/api/project/${testProjectId}/baselines/${baseline2Id}/activate`)
        .set(auth(adminToken));
      expect(act2Res.status).toBe(200);
      expect(act2Res.body.status).toBe('ACTIVE');

      // Verify BL-0001 is now SUPERSEDED
      const base1Check = await request(server)
        .get(`/api/baselines/${baseline1Id}`)
        .set(auth(adminToken));
      expect(base1Check.status).toBe(200);
      expect(base1Check.body.status).toBe('SUPERSEDED');
    });

    it('Step 9: Multi-tenant IDOR protection (Tenant B cannot access Tenant A baselines)', async () => {
      const crossTenant = await request(server)
        .get(`/api/baselines/${baseline1Id}`)
        .set(auth(bToken));
      expect([403, 404]).toContain(crossTenant.status);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // EXTENDED GOLDEN SCENARIO G3 — Multi-Project Capacity & Demand Intelligence
  // ══════════════════════════════════════════════════════════════════════════
  describe('Extended Golden Scenario G3 — Capacity Intelligence & What-If Simulations', () => {
    it('Step 1: Get multi-project capacity summary', async () => {
      const sumRes = await request(server)
        .get('/api/planning/capacity/summary')
        .query({ horizon: 'MONTHLY' })
        .set(auth(adminToken));

      expect(sumRes.status).toBe(200);
      expect(sumRes.body.theoreticalWorkstationCapacityHours).toBeGreaterThan(0);
      expect(sumRes.body.activeWorkstationsCount).toBeGreaterThanOrEqual(10);
      expect(sumRes.body.activeDesignEngineersCount).toBeGreaterThanOrEqual(1);
    });

    it('Step 2: Get time-distributed demand timeline curve', async () => {
      const timeRes = await request(server)
        .get('/api/planning/capacity/timeline')
        .query({ horizon: 'WEEKLY' })
        .set(auth(adminToken));

      expect(timeRes.status).toBe(200);
      expect(Array.isArray(timeRes.body)).toBe(true);
      expect(timeRes.body.length).toBe(8); // 8 weekly buckets
      expect(timeRes.body[0].periodKey).toBeDefined();
      expect(timeRes.body[0].engineerCapacityHours).toBeGreaterThan(0);
    });

    it('Step 3: Get live engineer utilization report', async () => {
      const utilRes = await request(server)
        .get('/api/planning/capacity/utilization')
        .set(auth(adminToken));

      expect(utilRes.status).toBe(200);
      expect(Array.isArray(utilRes.body)).toBe(true);
      if (utilRes.body.length > 0) {
        expect(utilRes.body[0].availableHours).toBe(160);
        expect(utilRes.body[0].allocatedUtilizationPct).toBeDefined();
        expect(utilRes.body[0].status).toBeDefined();
      }
    });

    it('Step 4: Run what-if simulation (simulating adding engineers & outsourcing)', async () => {
      const simRes = await request(server)
        .post('/api/planning/capacity/what-if')
        .set(auth(adminToken))
        .send({
          addEngineers: 2,
          engineerWeeklyHours: 40,
          outsourceHours: 50,
          addWorkstations: 1,
        });

      expect(simRes.status).toBe(200);
      expect(simRes.body.simulatedSummary).toBeDefined();
      expect(simRes.body.explanation).toContain('Simulation Scenario');
      expect(simRes.body.deltaCapacityHours).toBe(320); // 2 * 40 * 4 = 320h
      expect(simRes.body.deltaDemandHours).toBe(-50);
    });

    it('Step 5: Get deterministic capacity recommendations and risk alerts', async () => {
      const [recRes, riskRes] = await Promise.all([
        request(server)
          .get('/api/planning/capacity/recommendations')
          .set(auth(adminToken)),
        request(server)
          .get('/api/planning/capacity/risks')
          .set(auth(adminToken)),
      ]);

      expect(recRes.status).toBe(200);
      expect(riskRes.status).toBe(200);
      expect(Array.isArray(recRes.body)).toBe(true);
      expect(Array.isArray(riskRes.body)).toBe(true);
      expect(recRes.body.length).toBeGreaterThan(0);
      expect(recRes.body[0].recommendationType).toBeDefined();
    });

    it('Step 6: Tenant B isolation on capacity intelligence APIs', async () => {
      const tenantBSum = await request(server)
        .get('/api/planning/capacity/summary')
        .set(auth(bToken));

      expect(tenantBSum.status).toBe(200);
      expect(tenantBSum.body.activeProjectsCount).toBeDefined();
    });
  });
});
