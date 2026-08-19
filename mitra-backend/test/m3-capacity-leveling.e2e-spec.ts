import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

jest.setTimeout(300000);

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';
const unique = (p: string) => `${p}-${Date.now()}`;

describe('M3 Multi-Project Capacity Leveling (E2E)', () => {
  let app: INestApplication;
  let server: any;
  let ds: DataSource;
  let adminToken: string;
  let testProjectId: string;
  let emp1Id: string;
  let emp2Id: string;
  let loadStageId: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    ({ app } = await createTestApp());
    server = app.getHttpServer();
    ds = app.get(DataSource);

    // Ensure permissions
    await ds.query(`
      INSERT INTO permissions (resource, action, description) VALUES
      ('capacity', 'leveling_analyze', 'Analyze capacity leveling'),
      ('capacity', 'leveling_apply', 'Apply capacity leveling')
      ON CONFLICT (resource, action) DO NOTHING;
    `);

    await ds.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name IN ('ADMIN', 'MANAGEMENT')
        AND p.resource = 'capacity'
      ON CONFLICT DO NOTHING;
    `);

    // ── TENANT A ──
    const adminLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = adminLogin.body.access_token;
    const adminMe = await request(server).get('/api/auth/me').set(auth(adminToken)).expect(200);
    const tenantA = adminMe.body.tenantId;

    // Seed test employees in Tenant A
    const emp1 = await request(server)
      .post('/api/employees')
      .set(auth(adminToken))
      .send({
        employeeCode: unique('EMP1'),
        firstName: 'Senior',
        lastName: 'MoldDesigner',
        department: 'Design',
        designation: 'Principal CAD Specialist',
      })
      .expect(201);
    emp1Id = emp1.body.id;

    const emp2 = await request(server)
      .post('/api/employees')
      .set(auth(adminToken))
      .send({
        employeeCode: unique('EMP2'),
        firstName: 'Junior',
        lastName: 'Detailer',
        department: 'Design',
        designation: 'Tooling CAD Engineer',
      })
      .expect(201);
    emp2Id = emp2.body.id;

    // Seed test project
    const projRes = await request(server)
      .post('/api/project')
      .set(auth(adminToken))
      .send({
        name: 'Multi-Project Leveling Test Tooling',
        customerName: 'Aero Tooling Corp',
        productName: 'Turbine Shroud Mold',
      })
      .expect(201);
    testProjectId = projRes.body.id;

    // Create Design Load
    const loadRes = await request(server)
      .post('/api/design-loads')
      .set(auth(adminToken))
      .send({
        projectId: testProjectId,
        title: 'Turbine Shroud Tooling Design Load',
        complexityFactor: 1.5,
      })
      .expect(201);

    const loadId = loadRes.body.id;
    const loadDetails = await request(server)
      .get(`/api/design-loads/${loadId}`)
      .set(auth(adminToken))
      .expect(200);

    const stage = loadDetails.body.stages?.[0];
    expect(stage).toBeDefined();
    loadStageId = stage.id;

    // Assign stage to emp1
    await request(server)
      .patch(`/api/design-loads/stages/${loadStageId}`)
      .set(auth(adminToken))
      .send({
        assignedEmployeeId: emp1Id,
      })
      .expect(200);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('1. Capacity Leveling Analysis & Recommendations', () => {
    it('should analyze bottlenecks and produce explainable recommendations', async () => {
      const res = await request(server)
        .get('/api/planning/leveling/analyze')
        .set(auth(adminToken))
        .expect(200);

      expect(res.body.timestamp).toBeDefined();
      expect(res.body.recommendations).toBeInstanceOf(Array);
      expect(res.body.simulationOutcome).toBeDefined();
    });
  });

  describe('2. Applying Approved Leveling Reassignment', () => {
    it('should reassign stage from emp1 to emp2 upon explicit approval', async () => {
      const applyRes = await request(server)
        .post('/api/planning/leveling/apply')
        .set(auth(adminToken))
        .send({
          actionType: 'REASSIGN_ENGINEER',
          stageId: loadStageId,
          sourceEngineerId: emp1Id,
          targetEngineerId: emp2Id,
          notes: 'Reassigned to balance studio workload during peak tooling phase',
        })
        .expect(200);

      expect(applyRes.body.applied).toBe(true);
      expect(applyRes.body.stage.assignedEmployeeId).toBe(emp2Id);
      expect(applyRes.body.message).toContain('Successfully reassigned');
    });
  });
});
