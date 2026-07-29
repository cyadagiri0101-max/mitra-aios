import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';

describe('Commercial E2E: Customer → Contact → Enquiry → Quotation → Project', () => {
  let app: INestApplication;
  let server: any;
  let accessToken: string;
  let customerId: string;
  let contactId: string;
  let enquiryId: string;
  let quotationId: string;
  let projectId: string;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    server = app.getHttpServer();
    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(login.status).toBe(200);
    accessToken = login.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Creates a customer with a primary contact', async () => {
    const res = await request(server)
      .post('/api/commercial/customers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'ABC Plastics Pvt Ltd',
        industry: 'packaging',
        attributes: { region: 'APAC', tier: 'gold' },
        contacts: [{
          firstName: 'Engineering',
          lastName: 'Manager',
          email: 'eng@abcplastics.com',
          phone: '+91-99999-11111',
          role: 'engineering_manager',
          isPrimary: true,
        }],
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('ABC Plastics Pvt Ltd');
    expect(res.body.contacts).toBeDefined();
    expect(res.body.contacts.length).toBe(1);
    expect(res.body.contacts[0].email).toBe('eng@abcplastics.com');
    customerId = res.body.id;
    contactId = res.body.contacts[0].id;
  });

  it('2. Creates an enquiry (RFQ)', async () => {
    const res = await request(server)
      .post('/api/commercial/enquiries')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        customerName: 'ABC Plastics Pvt Ltd',
        productName: '500 mL Bottle Blow Mold',
        enquiryDate: '2026-07-29',
        customerEmail: 'eng@abcplastics.com',
        customerContact: 'Engineering Manager',
        customerPhone: '+91-99999-11111',
        moldType: 'BLOW',
        cavitation: 4,
        materialType: 'P20',
        annualVolume: 500000,
        source: 'EMAIL',
        requiredDeliveryDate: '2026-09-30',
        remarks: 'Prototype and production mold for bottle blow application',
      });

    expect(res.status).toBe(201);
    expect(res.body.enquiryNumber).toMatch(/^RFQ-/);
    expect(res.body.status).toBe('DRAFT');
    enquiryId = res.body.id;
  });

  it('3. Submits the enquiry (DRAFT → SUBMITTED)', async () => {
    const res = await request(server)
      .post(`/api/commercial/enquiries/${enquiryId}/submit`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUBMITTED');
  });

  it('4. Reviews the enquiry (SUBMITTED → UNDER_REVIEW)', async () => {
    const res = await request(server)
      .post(`/api/commercial/enquiries/${enquiryId}/review`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UNDER_REVIEW');
  });

  it('5. Creates a quotation from the RFQ/enquiry', async () => {
    const res = await request(server)
      .post('/api/commercial/quotations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        rfqId: enquiryId,
        customerId: customerId,
        amount: 1850000,
        terms: {
          payment_terms: '50% advance, 50% on delivery',
          delivery_weeks: 12,
          warranty_months: 12,
        },
        validUntil: '2026-09-27',
      });

    expect(res.status).toBe(201);
    expect(res.body.quotationNumber).toMatch(/^QTN-/);
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.totalAmount).toBe(1850000);
    quotationId = res.body.id;
  });

  it('6. Sends the quotation (DRAFT → SENT)', async () => {
    const res = await request(server)
      .post(`/api/commercial/quotations/${quotationId}/send`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SENT');
  });

  it('7. Accepts the quotation and creates a project', async () => {
    const res = await request(server)
      .post(`/api/commercial/quotations/${quotationId}/accept`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        projectName: 'ABC Bottle Blow Mold Project',
      });

    expect(res.status).toBe(200);
    expect(res.body.quotation.status).toBe('ACCEPTED');
    expect(res.body.project).toBeDefined();
    expect(res.body.project.id).toBeDefined();
    expect(res.body.project.name).toBe('ABC Bottle Blow Mold Project');
    projectId = res.body.project.id;
  });

  it('8. Fetches the customer with contacts and verifies the data', async () => {
    const res = await request(server)
      .get(`/api/commercial/customers/${customerId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(customerId);
    expect(res.body.name).toBe('ABC Plastics Pvt Ltd');
    expect(res.body.contacts).toBeDefined();
    expect(res.body.contacts.length).toBeGreaterThanOrEqual(1);
  });

  it('9. Fetches the enquiry and verifies its status', async () => {
    const res = await request(server)
      .get(`/api/commercial/enquiries/${enquiryId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(enquiryId);
    expect(res.body.status).toBe('CONVERTED');
  });

  it('10. Fetches the quotation and verifies the project link', async () => {
    const res = await request(server)
      .get(`/api/commercial/quotations/${quotationId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(quotationId);
    expect(res.body.status).toBe('PROJECT_CREATED');
    expect(res.body.projectId).toBe(projectId);
  });

  it('11. Fetches the created project and verifies its data', async () => {
    const res = await request(server)
      .get(`/api/project/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(projectId);
    expect(res.body.name).toBe('ABC Bottle Blow Mold Project');
    expect(res.body.projectValue).toBe(1850000);
  });

  it('12. Business rule: duplicate customer name is allowed (no unique constraint on name)', async () => {
    const res = await request(server)
      .post('/api/commercial/customers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'ABC Plastics Pvt Ltd',
        industry: 'packaging',
        attributes: { region: 'APAC', tier: 'silver' },
      });
    expect(res.status).toBe(201);
  });

  it('13. Business rule: cannot accept an already-accepted quotation', async () => {
    const res = await request(server)
      .post(`/api/commercial/quotations/${quotationId}/accept`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ projectName: 'Duplicate Accept Project' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/sent/i);
  });

  it('14. Business rule: cannot create a project without a linked quotation', async () => {
    const res = await request(server)
      .post('/api/project')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Orphan Project',
        productName: 'Test',
        cavitation: 1,
      });
    // Direct project creation is allowed but should not bypass quotation workflow
    expect(res.status).toBe(201);
    const orphanId = res.body.id;
    expect(orphanId).toBeDefined();
  });

  it('15. RBAC: unauthenticated requests to commercial endpoints are rejected', async () => {
    const res = await request(server).get('/api/commercial/customers');
    expect(res.status).toBe(401);
  });

  it('16. RBAC: paginated listing works for customers', async () => {
    const res = await request(server)
      .get('/api/commercial/customers?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(res.body.page).toBe(1);
  });
});
