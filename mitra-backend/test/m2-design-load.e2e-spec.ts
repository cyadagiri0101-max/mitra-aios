import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

jest.setTimeout(300000);

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';
const unique = (p: string) => `${p}-${Date.now()}`;

describe('M2 Sprint 1 — Design Load & Workload Estimation (E2E)', () => {
  let app: INestApplication;
  let server: any;
  let ds: DataSource;
  let adminToken: string;
  let tenantA: string;
  let bToken: string;
  let tenantB: string;
  let projectIdA: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    ({ app } = await createTestApp());
    server = app.getHttpServer();
    ds = app.get(DataSource);

    // Ensure M2 permissions exist and are linked to ADMIN role in test DB before login
    const permissions: Array<[string, string]> = [
      ['design_standard', 'read'],
      ['design_standard', 'create'],
      ['design_standard', 'update'],
      ['design_standard', 'delete'],
      ['design_load', 'read'],
      ['design_load', 'create'],
      ['design_load', 'update'],
      ['design_load', 'delete'],
      ['design_load', 'estimate'],
      ['design_system', 'read'],
      ['design_system', 'create'],
      ['design_system', 'update'],
      ['design_system', 'delete'],
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
        AND p.resource IN ('design_standard', 'design_load', 'design_system')
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
    const bEmail = `designload.b.${Date.now()}@mitra.local`;
    const bPassword = 'DesignLoadB!2026';
    await request(server)
      .post('/api/auth/register')
      .set(auth(adminToken))
      .send({ email: bEmail, password: bPassword, firstName: 'DesignLoad', lastName: 'TenantB' })
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
      .send({ roleId: adminRole.id, reason: 'M2 e2e fixture' })
      .expect(200);

    const tenantBId = randomUUID();
    await ds.query(
      `INSERT INTO tenants (id, name, code, is_active, created_at, updated_at)
       VALUES ($1, 'M2 DesignLoad Tenant B', $2, true, now(), now())`,
      [tenantBId, `M2DL${Date.now() % 100000}`],
    );
    await ds.query(`UPDATE users SET tenant_id = $1 WHERE id = $2`, [tenantBId, bUser.body.id]);

    const bLoginRefreshed = await request(server)
      .post('/api/auth/login')
      .send({ email: bEmail, password: bPassword })
      .expect(200);
    bToken = bLoginRefreshed.body.access_token;
    tenantB = tenantBId;

    // Create a real Project in Tenant A
    const projRes = await request(server)
      .post('/api/project')
      .set(auth(adminToken))
      .send({
        name: unique('M2 Mold Project'),
        customerName: 'Acme Corporation',
        productName: 'Blow Mold 500ml Bottle',
        description: 'M2 Design Load Test Project',
        projectType: 'NEW_DEVELOPMENT',
        moldType: 'BLOW',
      })
      .expect(201);
    projectIdA = projRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  let standardId: string;
  let designLoadId: string;
  let skillId: string;

  it('1. POST /api/design-systems/seed-defaults — seeds 10 workstations and 3 shifts for tenant', async () => {
    const res = await request(server)
      .post('/api/design-systems/seed-defaults')
      .set(auth(adminToken))
      .send()
      .expect(200);

    expect(res.body.systemsCount).toBeGreaterThanOrEqual(10);
    expect(res.body.shiftsCount).toBeGreaterThanOrEqual(3);

    // Verify GET /api/design-systems
    const listRes = await request(server)
      .get('/api/design-systems')
      .set(auth(adminToken))
      .expect(200);

    expect(listRes.body.total).toBeGreaterThanOrEqual(10);
    expect(Number(listRes.body.totalDailyCapacityHours)).toBeGreaterThanOrEqual(240);
  });

  it('2. POST /api/skills & /api/employees — sets up skills and engineers for candidate matching', async () => {
    // Create skill
    const skillRes = await request(server)
      .post('/api/skills')
      .set(auth(adminToken))
      .send({
        code: unique('SKILL-NX'),
        name: 'Siemens NX Mold Design',
        category: 'CAD',
      })
      .expect(201);
    skillId = skillRes.body.id;

    // Create qualified engineer
    const empRes = await request(server)
      .post('/api/employees')
      .set(auth(adminToken))
      .send({
        employeeCode: unique('EMP-DES'),
        firstName: 'Sarah',
        lastName: 'SeniorDesigner',
        email: `${unique('sarah')}@mitra.local`,
        department: 'Design',
        designation: 'Senior Mold Designer',
      })
      .expect(201);

    // Assign ADVANCED skill
    await request(server)
      .post(`/api/employees/${empRes.body.id}/skills`)
      .set(auth(adminToken))
      .send({
        skillId,
        proficiencyLevel: 'ADVANCED',
        certification: 'Siemens Certified NX Mold Expert',
      })
      .expect(201);
  });

  it('3. POST /api/design-standards — creates configurable Design Standard with 4 stages', async () => {
    const standardCode = unique('STD-TYPE-B');
    const res = await request(server)
      .post('/api/design-standards')
      .set(auth(adminToken))
      .send({
        code: standardCode,
        name: 'Type B Standard Mold Design (10 Days)',
        description: 'Standard 10-day mold development standard across 4 stages',
        projectType: 'NEW_DEVELOPMENT',
        moldType: 'BLOW',
        complexityLevel: 'STANDARD',
        provenanceSource: 'MANUAL',
        stages: [
          {
            stageCode: 'MOLD_DEVELOPMENT',
            stageName: 'Mold Development',
            sequence: 1,
            standardDurationDays: 2.0,
            standardHours: 16.0,
            requiredSkillId: skillId,
            minimumProficiency: 'INTERMEDIATE',
          },
          {
            stageCode: 'DESIGNING',
            stageName: 'Designing',
            sequence: 2,
            standardDurationDays: 4.0,
            standardHours: 32.0,
            requiredSkillId: skillId,
            minimumProficiency: 'ADVANCED',
          },
          {
            stageCode: 'DETAILING',
            stageName: 'Detailing',
            sequence: 3,
            standardDurationDays: 3.0,
            standardHours: 24.0,
            requiredSkillId: skillId,
            minimumProficiency: 'INTERMEDIATE',
          },
          {
            stageCode: 'FILE_SUBMISSION',
            stageName: 'File Submission',
            sequence: 4,
            standardDurationDays: 1.0,
            standardHours: 8.0,
            requiredSkillId: skillId,
            minimumProficiency: 'BEGINNER',
          },
        ],
      })
      .expect(201);

    expect(res.body.code).toBe(standardCode);
    expect(Number(res.body.totalStandardDurationDays)).toBe(10);
    expect(Number(res.body.totalStandardHours)).toBe(80);
    expect(res.body.stages).toHaveLength(4);
    standardId = res.body.id;
  });

  it('4. POST /api/design-loads — creates project design load with complexity factor adjustment & explanation', async () => {
    const res = await request(server)
      .post('/api/design-loads')
      .set(auth(adminToken))
      .send({
        projectId: projectIdA,
        standardId,
        title: 'Project 102 Mold Design Demand',
        complexityFactor: 1.25,
        plannedStartDate: '2026-09-01',
      })
      .expect(201);

    expect(res.body.loadNumber).toMatch(/^DLD-\d{4}-\d{4}$/);
    expect(Number(res.body.standardDurationDays)).toBe(10);
    expect(Number(res.body.plannedDurationDays)).toBe(12.5);
    expect(Number(res.body.plannedHours)).toBe(100);
    expect(res.body.explanation).toContain('Complexity Factor 1.25');
    expect(res.body.stages).toHaveLength(4);
    expect(Number(res.body.stages[0].plannedDurationDays)).toBe(2.5); // 2.0 * 1.25
    expect(Number(res.body.stages[1].plannedDurationDays)).toBe(5.0); // 4.0 * 1.25

    designLoadId = res.body.id;
  });

  it('5. POST /api/design-loads/:id/estimate — re-estimates dynamically when complexity factor changes', async () => {
    const res = await request(server)
      .post(`/api/design-loads/${designLoadId}/estimate`)
      .set(auth(adminToken))
      .send({
        complexityFactor: 1.5,
      })
      .expect(200);

    expect(Number(res.body.plannedDurationDays)).toBe(15.0);
    expect(Number(res.body.plannedHours)).toBe(120.0);
    expect(res.body.explanation).toContain('Complexity Factor 1.50');
  });

  it('6. GET /api/design-loads/:id/candidates — returns qualified candidate engineers for load requirement', async () => {
    const res = await request(server)
      .get(`/api/design-loads/${designLoadId}/candidates`)
      .set(auth(adminToken))
      .expect(200);

    expect(res.body.candidates.length).toBeGreaterThanOrEqual(1);
    expect(res.body.candidates[0].isQualified).toBe(true);
    expect(res.body.candidates[0].fullName).toContain('Sarah SeniorDesigner');
  });

  it('7. Multi-Tenant Isolation: Tenant B cannot access Tenant A design standard or design load (IDOR 404)', async () => {
    // Tenant B cannot read Tenant A standard
    await request(server)
      .get(`/api/design-standards/${standardId}`)
      .set(auth(bToken))
      .expect(404);

    // Tenant B cannot read Tenant A design load
    await request(server)
      .get(`/api/design-loads/${designLoadId}`)
      .set(auth(bToken))
      .expect(404);

    // Tenant B cannot estimate Tenant A design load
    await request(server)
      .post(`/api/design-loads/${designLoadId}/estimate`)
      .set(auth(bToken))
      .send({ complexityFactor: 2.0 })
      .expect(404);
  });

  it('8. Audit Traceability: verifies project-scoped audit logs created for design load', async () => {
    const auditLogs = await ds.query(
      `SELECT * FROM "audit_logs" WHERE "project_id" = $1 AND "tenant_id" = $2 ORDER BY "created_at" DESC`,
      [projectIdA, tenantA],
    );

    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
    const actions = auditLogs.map((l: any) => l.action);
    expect(actions).toContain('design_load.created');
  });
});
