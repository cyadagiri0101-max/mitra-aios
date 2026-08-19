import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

jest.setTimeout(300000);

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';
const unique = (p: string) => `${p}-${Date.now()}`;

describe('M3 Golden Scenario G6 — BOM Cost Rollup & Revision Compare (E2E)', () => {
  let app: INestApplication;
  let server: any;
  let ds: DataSource;
  let adminToken: string;
  let tenantA: string;
  let testProjectId: string;
  let testBomId: string;

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
    const adminMe = await request(server).get('/api/auth/me').set(auth(adminToken)).expect(200);
    tenantA = adminMe.body.tenantId;

    // Seed test project in Tenant A
    const projRes = await request(server)
      .post('/api/project')
      .set(auth(adminToken))
      .send({
        name: 'Precision Injection Mold BOM Revisions Project',
        customerName: 'Medical Device OEM',
        productName: 'Syringe Plunger Tool',
      })
      .expect(201);
    testProjectId = projRes.body.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('1. Multi-level BOM Creation & Initial Revision Snapshot (Rev A)', () => {
    it('should create a multi-level BOM and add components', async () => {
      const bomRes = await request(server)
        .post('/api/engineering/boms')
        .set(auth(adminToken))
        .send({
          projectId: testProjectId,
          name: '4-Cavity Injection Mold BOM',
          currency: 'USD',
        })
        .expect(201);

      testBomId = bomRes.body.id;
      expect(testBomId).toBeDefined();

      // Top-level assembly
      const baseItem = await request(server)
        .post(`/api/engineering/boms/${testBomId}/items`)
        .set(auth(adminToken))
        .send({
          partNumber: 'MOLD-BASE-01',
          partName: 'Standard 2 Plate Mold Base',
          itemType: 'ASSEMBLY',
          sourceType: 'MAKE',
          quantityPer: 1,
          uom: 'EA',
          unitCost: 5000,
        })
        .expect(201);

      // Child components under base
      await request(server)
        .post(`/api/engineering/boms/${testBomId}/items`)
        .set(auth(adminToken))
        .send({
          parentItemId: baseItem.body.id,
          partNumber: 'CAV-CORE-01',
          partName: 'Cavity Core Insert Set',
          itemType: 'PART',
          sourceType: 'MAKE',
          quantityPer: 2,
          uom: 'SET',
          unitCost: 2000,
        })
        .expect(201);

      await request(server)
        .post(`/api/engineering/boms/${testBomId}/items`)
        .set(auth(adminToken))
        .send({
          parentItemId: baseItem.body.id,
          partNumber: 'EJ-PIN-01',
          partName: 'Ejector Pin 6mm',
          itemType: 'PART',
          sourceType: 'BUY',
          quantityPer: 10,
          uom: 'EA',
          unitCost: 50,
        })
        .expect(201);

      // Perform cost rollup
      const rollupRes = await request(server)
        .get(`/api/engineering/boms/${testBomId}/cost`)
        .set(auth(adminToken))
        .expect(200);

      expect(Number(rollupRes.body.totalCost)).toBe(4500); // (2*2000) + (10*50) = 4500
    });

    it('should create revision snapshot for Revision A', async () => {
      const revARes = await request(server)
        .post(`/api/engineering/boms/${testBomId}/revisions`)
        .set(auth(adminToken))
        .send({
          revision: 'A',
          changeSummary: 'Initial baseline release of injection mold BOM',
        })
        .expect(201);

      expect(revARes.body.revision).toBe('A');
      expect(Number(revARes.body.totalCost)).toBe(4500);
    });
  });

  describe('2. BOM Evolution & Revision Snapshot (Rev B)', () => {
    it('should update BOM items and create Revision B', async () => {
      // Modify items: add new high-durability sleeve and create rev B
      await request(server)
        .post(`/api/engineering/boms/${testBomId}/items`)
        .set(auth(adminToken))
        .send({
          partNumber: 'EJ-SLEEVE-02',
          partName: 'Ejector Sleeve 8mm DLC Coated',
          itemType: 'PART',
          sourceType: 'BUY',
          quantityPer: 4,
          uom: 'EA',
          unitCost: 250,
        })
        .expect(201);

      await request(server)
        .get(`/api/engineering/boms/${testBomId}/cost`)
        .set(auth(adminToken))
        .expect(200);

      const revBRes = await request(server)
        .post(`/api/engineering/boms/${testBomId}/revisions`)
        .set(auth(adminToken))
        .send({
          revision: 'B',
          changeSummary: 'Added 4x DLC coated ejector sleeves for high cycle durability',
        })
        .expect(201);

      expect(revBRes.body.revision).toBe('B');
      expect(Number(revBRes.body.totalCost)).toBe(5500); // 4500 + 4*250 = 5500
    });
  });

  describe('3. Deterministic BOM Revision Comparison Diff Engine', () => {
    it('should compute exact diff with added, removed, modified, unchanged and cost deltas', async () => {
      const diffRes = await request(server)
        .get(`/api/engineering/boms/${testBomId}/compare/A/B`)
        .set(auth(adminToken))
        .expect(200);

      expect(diffRes.body.bomId).toBe(testBomId);
      expect(diffRes.body.revisionA.revision).toBe('A');
      expect(diffRes.body.revisionB.revision).toBe('B');

      expect(diffRes.body.summary.previousTotalCost).toBe(4500);
      expect(diffRes.body.summary.newTotalCost).toBe(5500);
      expect(diffRes.body.summary.costDelta).toBe(1000);
      expect(diffRes.body.summary.addedCount).toBe(1);
      expect(diffRes.body.summary.unchangedCount).toBe(3);

      expect(diffRes.body.details.added[0].partNumber).toBe('EJ-SLEEVE-02');
    });
  });
});
