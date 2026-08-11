import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

/**
 * P0-2 — MITRA v4.1 Production Proof: cross-tenant API-level isolation.
 *
 * Proves tenant isolation at the real HTTP surface with two live tenants:
 *   - TENANT A (seeded DEFAULT tenant, admin user)
 *   - TENANT B (test fixture: v4.1 has no public tenant-provisioning API,
 *     so a tenant row + the user's tenant_id are created through the
 *     DataSource directly — everything afterwards is exercised through the
 *     real API with real JWTs).
 *
 * Verified over the real API: project CRUD isolation, engineering BOM
 * creation + AI knowledge indexing per tenant, X-Tenant-ID escalation
 * attempts, AI chat retrieval scope, AI audit trail scope, and AI
 * conversation scope. No tenant can read, retrieve, chat about, or audit
 * another tenant's records.
 */
jest.setTimeout(300000);

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'phi3';
const unique = (p: string) => `${p}-${Date.now()}`;

async function pollFor(fn: () => Promise<boolean>, timeoutMs: number, intervalMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timed out after ${timeoutMs}ms`);
}

/** Direct Ollama reachability probe (the app's listModels never pings). */
async function ollamaUp(): Promise<boolean> {
  const url = `${process.env.OLLAMA_URL ?? 'http://localhost:11434'}/api/version`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

describe('P0-2 Cross-Tenant API Isolation (v4.1)', () => {
  let app: INestApplication;
  let server: any;
  let ds: DataSource;
  let adminToken: string;
  let adminUserId: string;
  let tenantA: string;
  let bToken: string;
  let tenantB: string;
  let bUserId: string;
  let projectA: { id: string; name: string };
  let projectB: { id: string; name: string };
  let bomA: { id: string; name: string; bomNumber: string };
  let bomB: { id: string; name: string; bomNumber: string };
  let conversationA: string;
  let conversationB: string;
  let ollamaReachable = false;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const chat = (body: Record<string, unknown>, token: string) =>
    request(server)
      .post('/api/ai/platform/chat')
      .set(auth(token))
      .send(body);

  beforeAll(async () => {
    ({ app } = await createTestApp());
    server = app.getHttpServer();
    ds = app.get(DataSource);

    // ── TENANT A: admin ────────────────────────────────────────────────
    const adminLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = adminLogin.body.access_token;
    const adminMe = await request(server)
      .get('/api/auth/me')
      .set(auth(adminToken))
      .expect(200);
    tenantA = adminMe.body.tenantId;
    expect(tenantA).toBeDefined();
    adminUserId = adminMe.body.id;
    expect(adminUserId).toBeDefined();

    // ── TENANT B fixture (no public tenant-provisioning API in v4.1) ───
    // 1. Register userB through the real API (lands in admin's tenant).
    const bEmail = `iso.b.${Date.now()}@mitra.local`;
    const bPassword = 'IsolationB!2026';
    await request(server)
      .post('/api/auth/register')
      .set(auth(adminToken))
      .send({ email: bEmail, password: bPassword, firstName: 'Isolation', lastName: 'TenantB' })
      .expect(201);
    const bLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: bEmail, password: bPassword })
      .expect(200);
    const bUser = await request(server)
      .get('/api/auth/me')
      .set(auth(bLogin.body.access_token))
      .expect(200);
    bUserId = bUser.body.id;

    // 2. Grant ADMIN through the real API (roles are global).
    const roles = await request(server)
      .get('/api/roles')
      .set(auth(adminToken))
      .expect(200);
    const adminRole = roles.body.find((r: { name: string }) => r.name === 'ADMIN');
    expect(adminRole).toBeDefined();
    await request(server)
      .post(`/api/users/${bUserId}/assign-role`)
      .set(auth(adminToken))
      .send({ roleId: adminRole.id, reason: 'P0-2 isolation fixture' })
      .expect(200);

    // 3. Move userB to a brand-new tenant (fixture-level only).
    tenantB = randomUUID();
    const tenantBCode = `ISOB${Date.now() % 100000}`;
    await ds.query(
      `INSERT INTO tenants (id, name, code, is_active, created_at, updated_at)
       VALUES ($1, 'Isolation Tenant B', $2, true, now(), now())`,
      [tenantB, tenantBCode],
    );
    await ds.query('UPDATE users SET tenant_id = $1 WHERE id = $2', [tenantB, bUserId]);

    // 4. Re-login → fresh JWT carrying tenantId B.
    const bLogin2 = await request(server)
      .post('/api/auth/login')
      .send({ email: bEmail, password: bPassword })
      .expect(200);
    bToken = bLogin2.body.access_token;
    const bMe = await request(server)
      .get('/api/auth/me')
      .set(auth(bToken))
      .expect(200);
    expect(bMe.body.tenantId).toBe(tenantB);
    expect(bMe.body.role).toBe('ADMIN');

    // ── Seed: one project + one BOM per tenant (real APIs) ─────────────
    const projA = await request(server)
      .post('/api/project')
      .set(auth(adminToken))
      .send({
        name: `ISO TENANT A PROJECT ${unique('')}`,
        customerName: 'CustomerA',
        productName: 'ProductA',
      })
      .expect(201);
    projectA = { id: projA.body.id, name: projA.body.name };

    const projB = await request(server)
      .post('/api/project')
      .set(auth(bToken))
      .send({
        name: `ISO TENANT B PROJECT ${unique('')}`,
        customerName: 'CustomerB',
        productName: 'ProductB',
      })
      .expect(201);
    projectB = { id: projB.body.id, name: projB.body.name };

    const b1 = await request(server)
      .post('/api/engineering/boms')
      .set(auth(adminToken))
      .send({ projectId: projectA.id, name: `BOM-A ${unique('')}` })
      .expect(201);
    bomA = { id: b1.body.id, name: b1.body.name, bomNumber: b1.body.bomNumber };

    const b2 = await request(server)
      .post('/api/engineering/boms')
      .set(auth(bToken))
      .send({ projectId: projectB.id, name: `BOM-B ${unique('')}` })
      .expect(201);
    bomB = { id: b2.body.id, name: b2.body.name, bomNumber: b2.body.bomNumber };

    // Wait for both tenants' async indexing to land (per-tenant rows).
    await pollFor(
      async () => {
        const [a, b] = await Promise.all([
          ds.query('SELECT id FROM knowledge_embeddings WHERE entity_id = $1 AND tenant_id = $2', [bomA.id, tenantA]),
          ds.query('SELECT id FROM knowledge_embeddings WHERE entity_id = $1 AND tenant_id = $2', [bomB.id, tenantB]),
        ]);
        return a.length > 0 && b.length > 0;
      },
      60_000,
      1000,
    );

    ollamaReachable = process.env.AI_ENABLED === 'true' && (await ollamaUp());

    // Chats that produce citations (both tenants, own data only).
    const chatA = await chat({ domain: 'engineering', message: `Explain the BOM ${bomA.name}` }, adminToken);
    expect(chatA.status).toBe(200);
    expect(chatA.body.references.some((r: any) => r.entityId === bomA.id)).toBe(true);
    expect(chatA.body.references.some((r: any) => r.entityId === bomB.id)).toBe(false);
    conversationA = chatA.body.conversationId;

    const chatB = await chat({ domain: 'engineering', message: `Explain the BOM ${bomB.name}` }, bToken);
    expect(chatB.status).toBe(200);
    expect(chatB.body.references.some((r: any) => r.entityId === bomB.id)).toBe(true);
    expect(chatB.body.references.some((r: any) => r.entityId === bomA.id)).toBe(false);
    conversationB = chatB.body.conversationId;
  });

  it('isolates project reads: tenant B cannot read tenant A projects', async () => {
    await request(server)
      .get(`/api/project/${projectA.id}`)
      .set(auth(bToken))
      .expect(404);
    const bList = await request(server)
      .get('/api/project')
      .set(auth(bToken))
      .expect(200);
    expect(bList.body.data.some((p: any) => p.id === projectA.id || p.name === projectA.name)).toBe(false);
    expect(bList.body.data.some((p: any) => p.id === projectB.id)).toBe(true);
  });

  it('keeps tenant A data invisible to tenant B even with an X-Tenant-ID escalation header', async () => {
    const res = await request(server)
      .get(`/api/project/${projectA.id}`)
      .set(auth(bToken))
      .set('X-Tenant-ID', tenantA)
      .expect(404);
    expect(res.status).toBe(404);

    const chatBLeak = await request(server)
      .post('/api/ai/platform/chat')
      .set(auth(bToken))
      .set('X-Tenant-ID', tenantA)
      .send({ domain: 'engineering', message: `Explain the BOM ${bomA.name}` })
      .expect(200);
    expect(chatBLeak.body.references).toHaveLength(0);
    expect(chatBLeak.body.provider).toBe('none');
  });

  it('isolates AI retrieval: tenant B gets no references for tenant A knowledge', async () => {
    const res = await chat({ domain: 'engineering', message: `Explain the BOM ${bomA.name}` }, bToken);
    expect(res.status).toBe(200);
    expect(res.body.references).toHaveLength(0);
    expect(res.body.provider).toBe('none');
    expect(res.body.answer).toContain('could not find authorized source records');
  });

  it('serves AI on each tenant with its own knowledge only', async () => {
    const resA = await chat({ domain: 'engineering', message: `Explain the BOM ${bomA.name}` }, adminToken);
    expect(resA.status).toBe(200);
    expect(resA.body.references.some((r: any) => r.entityId === bomA.id)).toBe(true);
    expect(resA.body.references.some((r: any) => r.entityId === bomB.id)).toBe(false);

    const resB = await chat({ domain: 'engineering', message: `Explain the BOM ${bomB.name}` }, bToken);
    expect(resB.status).toBe(200);
    expect(resB.body.references.some((r: any) => r.entityId === bomB.id)).toBe(true);
    expect(resB.body.references.some((r: any) => r.entityId === bomA.id)).toBe(false);

    if (ollamaReachable) {
      expect(resA.body.provider).toBe('ollama');
      expect(resB.body.provider).toBe('ollama');
    }
  });

  it('isolates the AI audit trail per tenant', async () => {
    const auditA = await request(server)
      .get('/api/ai/audit?action=chat&limit=50')
      .set(auth(adminToken))
      .expect(200);
    const auditB = await request(server)
      .get('/api/ai/audit?action=chat&limit=50')
      .set(auth(bToken))
      .expect(200);

    expect(auditA.body.data.length).toBeGreaterThanOrEqual(1);
    expect(auditB.body.data.length).toBeGreaterThanOrEqual(1);
    expect(auditA.body.data.some((e: any) => e.userId === bUserId)).toBe(false);
    expect(auditB.body.data.some((e: any) => e.userId === adminUserId)).toBe(false);
    expect(auditA.body.data.every((e: any) => e.tenantId === tenantA)).toBe(true);
    expect(auditB.body.data.every((e: any) => e.tenantId === tenantB)).toBe(true);
  });

  it('isolates AI conversations per tenant', async () => {
    const convsA = await request(server)
      .get('/api/ai/conversations?limit=20')
      .set(auth(adminToken))
      .expect(200);
    const convsB = await request(server)
      .get('/api/ai/conversations?limit=20')
      .set(auth(bToken))
      .expect(200);

    expect(convsA.body.data.some((c: any) => c.id === conversationA)).toBe(true);
    expect(convsB.body.data.some((c: any) => c.id === conversationB)).toBe(true);
    expect(convsA.body.data.some((c: any) => c.id === conversationB)).toBe(false);
    expect(convsB.body.data.some((c: any) => c.id === conversationA)).toBe(false);
  });
});
