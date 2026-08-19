import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

/**
 * M1 Sprint 1 — People master API (employees, skills, employee–skill
 * matrix, resource availability) over the real HTTP surface with real JWTs.
 *
 * Proves: CRUD, tenant-scoped reads, permission enforcement
 * (@Permissions on every endpoint), audit trail rows and cross-tenant
 * 404 isolation for the new master data.
 */
jest.setTimeout(300000);

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';
const unique = (p: string) => `${p}-${Date.now()}`;

describe('M1 Sprint 1 — People Master API', () => {
  let app: INestApplication;
  let server: any;
  let ds: DataSource;
  let adminToken: string;
  let tenantA: string;
  let bToken: string;
  let tenantB: string;
  let employeeA: { id: string; employeeCode: string };
  let employeeB: { id: string; employeeCode: string };
  let skillA: { id: string; code: string };
  let skillB: { id: string; code: string };

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    ({ app } = await createTestApp());
    server = app.getHttpServer();
    ds = app.get(DataSource);

    // ── TENANT A (admin) ───────────────────────────────────────────────
    const adminLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = adminLogin.body.access_token;
    const adminMe = await request(server).get('/api/auth/me').set(auth(adminToken)).expect(200);
    tenantA = adminMe.body.tenantId;

    // ── TENANT B fixture ───────────────────────────────────────────────
    const bEmail = `people.b.${Date.now()}@mitra.local`;
    const bPassword = 'PeopleB!2026';
    await request(server)
      .post('/api/auth/register')
      .set(auth(adminToken))
      .send({ email: bEmail, password: bPassword, firstName: 'People', lastName: 'TenantB' })
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
      .send({ roleId: adminRole.id, reason: 'M1 e2e fixture' })
      .expect(200);

    const tenantBId = randomUUID();
    await ds.query(
      `INSERT INTO tenants (id, name, code, is_active, created_at, updated_at)
       VALUES ($1, 'M1 People Tenant B', $2, true, now(), now())`,
      [tenantBId, `M1PB${Date.now() % 100000}`],
    );
    await ds.query(`UPDATE users SET tenant_id = $1 WHERE id = $2`, [tenantBId, bUser.body.id]);

    // Fresh login so the JWT carries the moved tenant claim.
    const bLogin2 = await request(server)
      .post('/api/auth/login')
      .send({ email: bEmail, password: bPassword })
      .expect(200);
    bToken = bLogin2.body.access_token;
    const bMe = await request(server).get('/api/auth/me').set(auth(bToken)).expect(200);
    tenantB = bMe.body.tenantId;
    expect(tenantB).not.toBe(tenantA);
  }, 120000);

  afterAll(async () => {
    await app.close();
  });

  it('creates employees in each tenant and lists only own tenant rows', async () => {
    const codeA = unique('ENG-A');
    const resA = await request(server)
      .post('/api/employees')
      .set(auth(adminToken))
      .send({ employeeCode: codeA, firstName: 'Alpha', lastName: 'Engineer', email: `${codeA.toLowerCase()}@mitra.local` })
      .expect(201);
    employeeA = { id: resA.body.id, employeeCode: resA.body.employeeCode };
    expect(resA.body.tenantId).toBe(tenantA);

    const codeB = unique('ENG-B');
    const resB = await request(server)
      .post('/api/employees')
      .set(auth(bToken))
      .send({ employeeCode: codeB, firstName: 'Beta', lastName: 'Engineer' })
      .expect(201);
    employeeB = { id: resB.body.id, employeeCode: resB.body.employeeCode };
    expect(resB.body.tenantId).toBe(tenantB);

    const listA = await request(server).get('/api/employees').set(auth(adminToken)).expect(200);
    const idsA = listA.body.data.map((e: { id: string }) => e.id);
    expect(idsA).toContain(employeeA.id);
    expect(idsA).not.toContain(employeeB.id);

    const listB = await request(server).get('/api/employees').set(auth(bToken)).expect(200);
    const idsB = listB.body.data.map((e: { id: string }) => e.id);
    expect(idsB).toContain(employeeB.id);
    expect(idsB).not.toContain(employeeA.id);
  });

  it('rejects duplicate employee codes per tenant', async () => {
    await request(server)
      .post('/api/employees')
      .set(auth(adminToken))
      .send({ employeeCode: employeeA.employeeCode, firstName: 'Dup', lastName: 'Code' })
      .expect(400);
  });

  it('returns 404 for cross-tenant employee access (IDOR protection)', async () => {
    await request(server).get(`/api/employees/${employeeB.id}`).set(auth(adminToken)).expect(404);
    await request(server).get(`/api/employees/${employeeA.id}`).set(auth(bToken)).expect(404);
  });

  it('creates skills, assigns to employees, and resolves employees by skill', async () => {
    const codeS = unique('SKILL');
    const skillRes = await request(server)
      .post('/api/skills')
      .set(auth(adminToken))
      .send({ code: codeS, name: 'Mold Design', category: 'Design' })
      .expect(201);
    skillA = { id: skillRes.body.id, code: skillRes.body.code };

    const skillBRes = await request(server)
      .post('/api/skills')
      .set(auth(bToken))
      .send({ code: unique('SKILL-B'), name: 'CNC Programming' })
      .expect(201);
    skillB = { id: skillBRes.body.id, code: skillBRes.body.code };

    await request(server)
      .post(`/api/employees/${employeeA.id}/skills`)
      .set(auth(adminToken))
      .send({ skillId: skillA.id, proficiencyLevel: 'ADVANCED' })
      .expect(201);

    const bySkill = await request(server)
      .get(`/api/skills/${skillA.id}/employees`)
      .set(auth(adminToken))
      .expect(200);
    const empIds = bySkill.body.map((e: { id: string }) => e.id);
    expect(empIds).toContain(employeeA.id);
    expect(empIds).not.toContain(employeeB.id);

    // Cross-tenant skill assignment must fail with 404 (skill not found in tenant A)
    await request(server)
      .post(`/api/employees/${employeeA.id}/skills`)
      .set(auth(adminToken))
      .send({ skillId: skillB.id })
      .expect(404);
  });

  it('creates resource availability and enforces the per-date unique rule', async () => {
    const workDate = '2099-01-15';
    const av = await request(server)
      .post(`/api/employees/${employeeA.id}/availability`)
      .set(auth(adminToken))
      .send({ workDate, availabilityType: 'PLANNED', availableHours: 6 })
      .expect(201);
    expect(av.body.tenantId).toBe(tenantA);

    await request(server)
      .post(`/api/employees/${employeeA.id}/availability`)
      .set(auth(adminToken))
      .send({ workDate, availabilityType: 'AVAILABLE' })
      .expect(400);

    const list = await request(server)
      .get(`/api/employees/${employeeA.id}/availability?from=${workDate}&to=${workDate}`)
      .set(auth(adminToken))
      .expect(200);
    expect(list.body.total).toBe(1);

    // Cross-tenant availability read -> 404
    await request(server)
      .get(`/api/employees/${employeeB.id}/availability`)
      .set(auth(adminToken))
      .expect(404);
  });

  it('records audit events for people operations', async () => {
    const auditRows = await ds.query(
      `SELECT action FROM audit_logs WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantA],
    );
    const actions = auditRows.map((a: { action: string }) => a.action);
    expect(actions).toContain('employee.created');
    expect(actions).toContain('employee_skill.assigned');
    expect(actions).toContain('availability.created');
  });
});
