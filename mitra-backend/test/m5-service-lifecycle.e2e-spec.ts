import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { createTestApp } from './utils/test-app';

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';

describe('Milestone M5 — Golden Scenario G10: Service & Customer Lifecycle Governance (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let ds: DataSource;
  let adminToken: string;
  let tenantBToken: string;
  let projectId: string;
  let customerId: string;
  let dispatchId: string;
  let installationId: string;
  let warrantyId: string;
  let serviceRequestId: string;
  let claimId: string;

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
    const bEmail = `tenantb.g10.${Date.now()}@mitra.local`;
    const bPassword = 'ServiceTenantB!2026';
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
        .send({ roleId: adminRole.id, reason: 'M5 e2e fixture' })
        .expect(200);
    }

    const tenantBId = randomUUID();
    await ds.query(
      `INSERT INTO tenants (id, name, code, is_active, created_at, updated_at)
       VALUES ($1, 'M5 Tenant B', $2, true, now(), now())`,
      [tenantBId, `M5G10${Date.now() % 100000}`],
    );
    await ds.query(`UPDATE users SET tenant_id = $1 WHERE id = $2`, [tenantBId, bUser.body.id]);

    const bLoginRefreshed = await request(server)
      .post('/api/auth/login')
      .send({ email: bEmail, password: bPassword })
      .expect(200);
    tenantBToken = bLoginRefreshed.body.access_token;

    // 3. Create Customer
    const custRes = await request(server)
      .post('/api/commercial/customers')
      .set(auth(adminToken))
      .send({
        name: unique('AeroTech Customer'),
        industry: 'aerospace',
        contacts: [{
          firstName: 'Vikram',
          lastName: 'Mehta',
          email: `${unique('vikram')}@aerotech.com`,
          phone: '+91-98765-43210',
          role: 'engineering_manager',
          isPrimary: true,
        }],
      })
      .expect(201);
    customerId = custRes.body.id;

    // 4. Create Project
    const projRes = await request(server)
      .post('/api/project')
      .set(auth(adminToken))
      .send({
        name: unique('Tooling G10 Lifecycle Die'),
        customerName: 'AeroTech Systems Ltd',
        productName: 'Precision Die Assembly',
        customerId,
      })
      .expect(201);
    projectId = projRes.body.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Stage 1: Dispatch Planning & Shipment Governance (W1)', () => {
    it('1.1 Should create a new Dispatch Plan in PLANNING status', async () => {
      const res = await request(server)
        .post('/api/dispatch')
        .set(auth(adminToken))
        .send({
          customerName: 'AeroTech Systems Ltd',
          projectId,
          plannedDate: new Date().toISOString().split('T')[0],
          notes: 'Precision stamping mold ready for customer dispatch',
          packingList: [
            { item: 'Top Die Shoe', qty: 1, inspected: true },
            { item: 'Bottom Die Shoe', qty: 1, inspected: true },
            { item: 'Punch & Die Inserts', qty: 8, inspected: true },
          ],
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('PLANNING');
      expect(res.body.dispatchNumber).toBeDefined();
      dispatchId = res.body.id;
    });

    it('1.2 Should reject invalid transition DELIVER from PLANNING', async () => {
      await request(server)
        .post(`/api/dispatch/${dispatchId}/transition`)
        .set(auth(adminToken))
        .send({ transition: 'DELIVER' })
        .expect(400);
    });

    it('1.3 Should reject invalid transition SHIP from PLANNING', async () => {
      await request(server)
        .post(`/api/dispatch/${dispatchId}/transition`)
        .set(auth(adminToken))
        .send({ transition: 'SHIP', carrier: 'BlueDart', trackingNumber: 'BDF-XYZ' })
        .expect(400);
    });

    it('1.4 Should PACK the dispatch', async () => {
      const res = await request(server)
        .post(`/api/dispatch/${dispatchId}/transition`)
        .set(auth(adminToken))
        .send({
          transition: 'PACK',
          notes: 'Wooden crate sealed with moisture barrier',
        })
        .expect(201);

      expect(res.body.status).toBe('PACKED');
    });

    it('1.5 Should reject SHIP transition when carrier/tracking is missing', async () => {
      await request(server)
        .post(`/api/dispatch/${dispatchId}/transition`)
        .set(auth(adminToken))
        .send({
          transition: 'SHIP',
        })
        .expect(400);
    });

    it('1.6 Should SHIP the dispatch with carrier and tracking details', async () => {
      const res = await request(server)
        .post(`/api/dispatch/${dispatchId}/transition`)
        .set(auth(adminToken))
        .send({
          transition: 'SHIP',
          carrier: 'BlueDart Freight Logistics',
          trackingNumber: 'BDF-883920194-IN',
          notes: 'Dispatched via air freight express',
        })
        .expect(201);

      expect(res.body.status).toBe('SHIPPED');
      expect(res.body.carrier).toBe('BlueDart Freight Logistics');
      expect(res.body.trackingNumber).toBe('BDF-883920194-IN');
      expect(res.body.shippedDate).toBeDefined();
    });

    it('1.7 Should DELIVER the dispatch to customer site', async () => {
      const res = await request(server)
        .post(`/api/dispatch/${dispatchId}/transition`)
        .set(auth(adminToken))
        .send({
          transition: 'DELIVER',
          notes: 'Received and verified at AeroTech facility gate 4',
        })
        .expect(201);

      expect(res.body.status).toBe('DELIVERED');
      expect(res.body.deliveredDate).toBeDefined();
    });
  });

  describe('Stage 2: On-Site Installation & Commissioning Sign-Off (W2 & W3)', () => {
    it('2.1 Should schedule a Service Installation record', async () => {
      const res = await request(server)
        .post('/api/service/installations')
        .set(auth(adminToken))
        .send({
          projectId,
          dispatchId,
          customerId,
          siteReadiness: 'Hydraulic press bed aligned, coolant lines tested and ready',
          installationDate: new Date().toISOString().split('T')[0],
          checklist: [
            { item: 'Bed alignment check', status: 'PASS' },
            { item: 'Hydraulic clamping pressure verification', status: 'PASS' },
            { item: 'Dry cycle trial run (50 cycles)', status: 'PASS' },
          ],
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('SCHEDULED');
      installationId = res.body.id;
    });

    it('2.2 Should complete commissioning with customer sign-off and auto-activate warranty', async () => {
      const res = await request(server)
        .post(`/api/service/installations/${installationId}/complete`)
        .set(auth(adminToken))
        .send({
          signoffBy: 'Vikram Mehta (Chief Plant Engineer, AeroTech)',
          installationReport: 'Tool successfully commissioned. First article stamping dimensions verified 100% in tolerance.',
          checklist: [
            { item: 'Bed alignment check', result: 'PASS' },
            { item: 'Hydraulic clamping pressure verification', result: 'PASS' },
            { item: 'Dry cycle trial run (50 cycles)', result: 'PASS' },
            { item: 'First article dimensional verification', result: 'PASS' },
          ],
          autoActivateWarranty: true,
          coverageMonths: 12,
        })
        .expect(201);

      expect(res.body.installation.status).toBe('COMPLETED');
      expect(res.body.installation.customerSignoff).toBe(true);
      expect(res.body.installation.signoffBy).toContain('Vikram Mehta');
      expect(res.body.warranty).toBeDefined();
      expect(res.body.warranty.status).toBe('ACTIVE');
      expect(res.body.warranty.coverageMonths).toBe(12);

      warrantyId = res.body.warranty.id;
    });

    it('2.3 Should verify active warranty coverage validity', async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await request(server)
        .get(`/api/service/warranty/${warrantyId}/coverage?incidentDate=${today}`)
        .set(auth(adminToken))
        .expect(200);

      expect(res.body.isCovered).toBe(true);
      expect(res.body.warranty.status).toBe('ACTIVE');
    });
  });

  describe('Stage 3: Field Breakdown, Service Visit & Repair (W4)', () => {
    it('3.1 Should log a Field Service Request under warranty', async () => {
      const res = await request(server)
        .post('/api/service/requests')
        .set(auth(adminToken))
        .send({
          customerName: 'AeroTech Systems Ltd',
          projectId,
          serviceType: 'REPAIR',
          priority: 'HIGH',
          warrantyClaim: true,
          reportedDate: new Date().toISOString().split('T')[0],
          issueDescription: 'Hydraulic core pin stuck on stroke 12,450 during batch run',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('OPEN');
      expect(res.body.priority).toBe('HIGH');
      serviceRequestId = res.body.id;
    });

    it('3.2 Should record an on-site Service Visit with parts replaced', async () => {
      const res = await request(server)
        .post('/api/service/visits')
        .set(auth(adminToken))
        .send({
          serviceRequestId,
          projectId,
          customerId,
          visitDate: new Date().toISOString().split('T')[0],
          serviceType: 'EMERGENCY_REPAIR',
          workPerformed: 'Disassembled side slide core, replaced damaged pin guide bushing, realigned slide stops',
          travelHours: 3.5,
          serviceHours: 6.0,
          partsUsed: [
            { partCode: 'BSH-CORE-40', partName: 'Hardened Guide Bushing 40mm', qty: 2 },
            { partCode: 'PIN-RET-12', partName: 'Return Ejector Pin', qty: 1 },
          ],
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.partsUsed.length).toBe(2);
    });
  });

  describe('Stage 4: Warranty Claim Adjudication & Service Request Resolution (W5)', () => {
    it('4.1 Should submit a Warranty Claim linked to the warranty and service request', async () => {
      const res = await request(server)
        .post('/api/service/warranty-claims')
        .set(auth(adminToken))
        .send({
          warrantyId,
          serviceRequestId,
          projectId,
          claimDate: new Date().toISOString().split('T')[0],
          issueSummary: 'Early slide bushing failure under standard production cycles',
          claimAmount: 125000,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('SUBMITTED');
      claimId = res.body.id;
    });

    it('4.2 Should adjudicate and APPROVE the warranty claim, auto-resolving the service ticket', async () => {
      const res = await request(server)
        .post(`/api/service/warranty-claims/${claimId}/adjudicate`)
        .set(auth(adminToken))
        .send({
          decision: 'APPROVE',
          approvalNotes: 'Material inspection confirmed guide bushing tolerance drift from supplier lot. Covered 100% under warranty.',
          resolutionNotes: 'Field repair completed with hardened replacement bushing; mold operational.',
        })
        .expect(201);

      expect(res.body.claim.status).toBe('APPROVED');
      expect(res.body.claim.approvedBy).toBeDefined();
      expect(res.body.claim.approvedAmount).toBe(125000);
      expect(res.body.request.status).toBe('RESOLVED');
      expect(res.body.request.resolutionSummary).toContain('Field repair completed');
    });

    it('4.3 Should prevent re-adjudication of already decided claim', async () => {
      await request(server)
        .post(`/api/service/warranty-claims/${claimId}/adjudicate`)
        .set(auth(adminToken))
        .send({
          decision: 'REJECT',
          rejectionReason: 'Should fail because already approved',
        })
        .expect(400);
    });
  });

  describe('Stage 5: Unified Project Service Digital Thread Lineage (W6)', () => {
    it('5.1 Should query contiguous Project-to-Service digital thread lineage', async () => {
      const res = await request(server)
        .get(`/api/service/projects/${projectId}/lineage`)
        .set(auth(adminToken))
        .expect(200);

      expect(res.body.projectId).toBe(projectId);
      expect(res.body.dispatches.length).toBeGreaterThanOrEqual(1);
      expect(res.body.installations.length).toBeGreaterThanOrEqual(1);
      expect(res.body.warranties.length).toBeGreaterThanOrEqual(1);
      expect(res.body.serviceRequests.length).toBeGreaterThanOrEqual(1);
      expect(res.body.visits.length).toBeGreaterThanOrEqual(1);
      expect(res.body.claims.length).toBeGreaterThanOrEqual(1);

      // Verify Metrics Integrity
      expect(res.body.metrics.deliveredDispatches).toBeGreaterThanOrEqual(1);
      expect(res.body.metrics.completedInstallations).toBeGreaterThanOrEqual(1);
      expect(res.body.metrics.activeWarranties).toBeGreaterThanOrEqual(1);
      expect(res.body.metrics.approvedClaims).toBeGreaterThanOrEqual(1);
      expect(res.body.metrics.resolvedServiceRequests).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Stage 6: Multi-Tenant Security & Isolation (W7)', () => {
    it('6.1 Should reject unauthenticated access with 401', async () => {
      await request(server)
        .get(`/api/service/projects/${projectId}/lineage`)
        .expect(401);
    });

    it('6.2 Should fail closed with 404 when querying another tenant project lineage', async () => {
      if (tenantBToken) {
        await request(server)
          .get(`/api/service/projects/${projectId}/lineage`)
          .set(auth(tenantBToken))
          .expect(404);
      }
    });
  });
});
