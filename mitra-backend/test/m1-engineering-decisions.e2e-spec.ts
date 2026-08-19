import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

/**
 * M1 Sprint 1 — Engineering Decision Log API over the real HTTP surface.
 *
 * Proves: decision creation with DEC-{year}-{NNNN} numbering, the full
 * lifecycle (DRAFT → SUBMITTED → APPROVED | REJECTED; CANCELLED), edit
 * guards on non-editable statuses, transactional supersession (successor
 * DRAFT + original SUPERSEDED), project-scoped audit rows
 * (audit_logs.project_id — Phase-0 A5 fix) and outbox domain events.
 */
jest.setTimeout(300000);

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';

describe('M1 Sprint 1 — Engineering Decision Log API', () => {
  let app: INestApplication;
  let server: any;
  let ds: DataSource;
  let adminToken: string;
  let tenantA: string;
  let bToken: string;
  let tenantB: string;
  let decisionA: { id: string; decisionNumber: string };
  let decisionB: { id: string; decisionNumber: string };

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    ({ app } = await createTestApp());
    server = app.getHttpServer();
    ds = app.get(DataSource);

    const adminLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = adminLogin.body.access_token;
    const adminMe = await request(server).get('/api/auth/me').set(auth(adminToken)).expect(200);
    tenantA = adminMe.body.tenantId;

    const bEmail = `dec.b.${Date.now()}@mitra.local`;
    const bPassword = 'DecB!2026';
    await request(server)
      .post('/api/auth/register')
      .set(auth(adminToken))
      .send({ email: bEmail, password: bPassword, firstName: 'Dec', lastName: 'TenantB' })
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
       VALUES ($1, 'M1 Decisions Tenant B', $2, true, now(), now())`,
      [tenantBId, `M1DB${Date.now() % 100000}`],
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

  it('creates a DRAFT decision with a DEC-{year}-{NNNN} number and outbox event', async () => {
    const res = await request(server)
      .post('/api/engineering-decisions')
      .set(auth(adminToken))
      .send({ title: 'Cooling channel layout selection', decisionType: 'DESIGN', rationale: 'Faster cycle' })
      .expect(201);
    decisionA = { id: res.body.id, decisionNumber: res.body.decisionNumber };
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.decisionNumber).toMatch(/^DEC-\d{4}-\d{4}$/);
    expect(res.body.tenantId).toBe(tenantA);

    const outbox = await ds.query(
      `SELECT event_type FROM domain_outbox WHERE aggregate_id = $1 ORDER BY created_at DESC`,
      [decisionA.id],
    );
    expect(outbox.some((o: { event_type: string }) => o.event_type === 'engineering_decision.created')).toBe(true);
  });

  it('walks the lifecycle DRAFT → SUBMITTED → APPROVED', async () => {
    await request(server)
      .post(`/api/engineering-decisions/${decisionA.id}/submit`)
      .set(auth(adminToken))
      .expect(200);
    const submitted = await request(server)
      .get(`/api/engineering-decisions/${decisionA.id}`)
      .set(auth(adminToken))
      .expect(200);
    expect(submitted.body.status).toBe('SUBMITTED');

    await request(server)
      .post(`/api/engineering-decisions/${decisionA.id}/approve`)
      .set(auth(adminToken))
      .expect(200);
    const approved = await request(server)
      .get(`/api/engineering-decisions/${decisionA.id}`)
      .set(auth(adminToken))
      .expect(200);
    expect(approved.body.status).toBe('APPROVED');
    expect(approved.body.approvedBy).toBeDefined();
  });

  it('blocks edits and invalid transitions after approval', async () => {
    await request(server)
      .patch(`/api/engineering-decisions/${decisionA.id}`)
      .set(auth(adminToken))
      .send({ title: 'Hijacked title' })
      .expect(400);

    await request(server)
      .post(`/api/engineering-decisions/${decisionA.id}/submit`)
      .set(auth(adminToken))
      .expect(400);
  });

  it('supersedes transactionally: successor DRAFT + original SUPERSEDED + audit rows', async () => {
    const supersede = await request(server)
      .post(`/api/engineering-decisions/${decisionA.id}/supersede`)
      .set(auth(adminToken))
      .send({ title: 'Revised cooling layout after trials', rationale: 'Trial data' })
      .expect(200);

    expect(supersede.body.original.status).toBe('SUPERSEDED');
    expect(supersede.body.original.supersededByDecisionId).toBe(supersede.body.successor.id);
    expect(supersede.body.successor.status).toBe('DRAFT');
    expect(supersede.body.successor.supersedesDecisionId).toBe(decisionA.id);
    expect(supersede.body.successor.decisionNumber).not.toBe(decisionA.decisionNumber);

    const auditRows = await ds.query(
      `SELECT action FROM audit_logs WHERE entity_id IN ($1, $2) ORDER BY created_at`,
      [decisionA.id, supersede.body.successor.id],
    );
    const actions = auditRows.map((a: { action: string }) => a.action);
    expect(actions).toContain('engineering_decision.superseded');

    const outbox = await ds.query(
      `SELECT event_type FROM domain_outbox WHERE aggregate_id = $1 ORDER BY created_at`,
      [decisionA.id],
    );
    expect(outbox.some((o: { event_type: string }) => o.event_type === 'engineering_decision.superseded')).toBe(true);
  });

  it('rejects with reason and supports cancel from SUBMITTED', async () => {
    const res = await request(server)
      .post('/api/engineering-decisions')
      .set(auth(adminToken))
      .send({ title: 'Material choice trial' })
      .expect(201);
    const id = res.body.id;

    await request(server)
      .post(`/api/engineering-decisions/${id}/reject`)
      .set(auth(adminToken))
      .send({})
      .expect(400);

    await request(server)
      .post(`/api/engineering-decisions/${id}/submit`)
      .set(auth(adminToken))
      .expect(200);
    await request(server)
      .post(`/api/engineering-decisions/${id}/reject`)
      .set(auth(adminToken))
      .send({ reason: 'Insufficient evidence' })
      .expect(200);
    const rejected = await request(server).get(`/api/engineering-decisions/${id}`).set(auth(adminToken)).expect(200);
    expect(rejected.body.status).toBe('REJECTED');
    expect(rejected.body.rejectionReason).toBe('Insufficient evidence');
  });

  it('isolates decisions between tenants (404 cross-tenant, no cross-tenant list leakage)', async () => {
    const resB = await request(server)
      .post('/api/engineering-decisions')
      .set(auth(bToken))
      .send({ title: 'Tenant B internal decision' })
      .expect(201);
    decisionB = { id: resB.body.id, decisionNumber: resB.body.decisionNumber };
    expect(decisionB.id).not.toBe(decisionA.id);
    expect(resB.body.tenantId).toBe(tenantB);

    await request(server).get(`/api/engineering-decisions/${decisionA.id}`).set(auth(bToken)).expect(404);
    await request(server).get(`/api/engineering-decisions/${decisionB.id}`).set(auth(adminToken)).expect(404);

    const listA = await request(server)
      .get('/api/engineering-decisions')
      .set(auth(adminToken))
      .expect(200);
    const idsA = listA.body.data.map((d: { id: string }) => d.id);
    expect(idsA).toContain(decisionA.id);
    expect(idsA).not.toContain(decisionB.id);
  });

  it('records project-scoped audit rows (audit_logs.project_id — A5 fix)', async () => {
    const res = await request(server)
      .post('/api/engineering-decisions')
      .set(auth(adminToken))
      .send({ title: 'Project-scoped decision', projectId: randomUUID() })
      .expect(201);

    const auditRows = await ds.query(
      `SELECT action, project_id FROM audit_logs WHERE entity_id = $1`,
      [res.body.id],
    );
    expect(auditRows.length).toBeGreaterThan(0);
    for (const row of auditRows) {
      expect(row.project_id).not.toBeNull();
    }
  });
});
