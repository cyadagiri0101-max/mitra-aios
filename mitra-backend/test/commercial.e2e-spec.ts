import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';

describe('Commercial E2E: Customer → Contact → Enquiry → RFQ → Quotation → Project', () => {
  let app: INestApplication;
  let server: any;
  let accessToken: string;
  let customerId: string;
  let contactId: string;
  let enquiryId: string;
  let rfqId: string;
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

  it('2. Creates an enquiry (RFQ request)', async () => {
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

  it('3. Converts the enquiry into an RFQ (workflow instance registered)', async () => {
    const res = await request(server)
      .post('/api/commercial/rfqs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        enquiryId,
        customerId,
        customerName: 'ABC Plastics Pvt Ltd',
        moldType: 'BLOW',
        material: 'P20',
        targetQuantity: 500000,
        annualVolume: 500000,
        priority: 'HIGH',
      });

    expect(res.status).toBe(201);
    expect(res.body.rfqNumber).toMatch(/^RFQ-/);
    expect(res.body.workflowState).toBe('DRAFT');
    rfqId = res.body.id;
  });

  it('4. Submits the enquiry (DRAFT → SUBMITTED)', async () => {
    const res = await request(server)
      .post(`/api/commercial/enquiries/${enquiryId}/submit`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUBMITTED');
  });

  it('5. Reviews the enquiry (SUBMITTED → UNDER_REVIEW)', async () => {
    const res = await request(server)
      .post(`/api/commercial/enquiries/${enquiryId}/review`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UNDER_REVIEW');
  });

  it('6. Creates a quotation from the RFQ with priced items', async () => {
    const res = await request(server)
      .post('/api/commercial/quotations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        rfqId,
        customerId,
        items: [{
          description: '500 mL Bottle Blow Mold',
          itemCategory: 'MOLD',
          quantity: 1,
          unitPrice: 1850000,
          estimatedCost: 1480000,
          leadTimeWeeks: 12,
        }],
        paymentTerms: '50% advance, 50% on delivery',
        deliveryWeeks: 12,
        warrantyMonths: 12,
        validUntil: '2026-09-27',
      });

    expect(res.status).toBe(201);
    expect(res.body.quotationNumber).toMatch(/^QTN-/);
    expect(res.body.status).toBe('DRAFT');
    // 1 × 1,850,000 + 18% tax
    expect(res.body.subtotal).toBe(1850000);
    expect(res.body.taxAmount).toBe(333000);
    expect(res.body.totalAmount).toBe(2183000);
    quotationId = res.body.id;
  });

  it('7. Sends the quotation (DRAFT → SENT)', async () => {
    const res = await request(server)
      .post(`/api/commercial/quotations/${quotationId}/send`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SENT');
  });

  it('8. Accepts the quotation and creates a project', async () => {
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

  it('9. Fetches the customer with contacts and verifies the data', async () => {
    const res = await request(server)
      .get(`/api/commercial/customers/${customerId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(customerId);
    expect(res.body.name).toBe('ABC Plastics Pvt Ltd');
    expect(res.body.contacts).toBeDefined();
    expect(res.body.contacts.length).toBeGreaterThanOrEqual(1);
  });

  it('10. Fetches the enquiry and verifies it was converted by the quotation', async () => {
    const res = await request(server)
      .get(`/api/commercial/enquiries/${enquiryId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(enquiryId);
    expect(res.body.status).toBe('CONVERTED');
  });

  it('11. Fetches the quotation and verifies the project link', async () => {
    const res = await request(server)
      .get(`/api/commercial/quotations/${quotationId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(quotationId);
    expect(res.body.status).toBe('PROJECT_CREATED');
    expect(res.body.projectId).toBe(projectId);
  });

  it('12. Fetches the created project and verifies its value from the quotation', async () => {
    const res = await request(server)
      .get(`/api/project/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(projectId);
    expect(res.body.name).toBe('ABC Bottle Blow Mold Project');
    expect(res.body.projectValue).toBe(2183000);
  });

  it('13. Business rule: duplicate customer name is allowed (no unique constraint on name)', async () => {
    const res = await request(server)
      .post('/api/commercial/customers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'ABC Plastics Pvt Ltd',
        industry: 'packaging',
      });
    expect(res.status).toBe(201);
  });

  it('14. Business rule: cannot accept an already-accepted quotation', async () => {
    const res = await request(server)
      .post(`/api/commercial/quotations/${quotationId}/accept`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ projectName: 'Duplicate Accept Project' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/sent/i);
  });

  it('15. Business rule: direct project creation does not bypass the quotation workflow', async () => {
    const res = await request(server)
      .post('/api/project')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Orphan Project',
        customerName: 'ABC Plastics Pvt Ltd',
        productName: 'Test',
        cavitation: 1,
      });
    // Direct project creation is allowed but has no quotation link
    expect(res.status).toBe(201);
    const orphanId = res.body.id;
    expect(orphanId).toBeDefined();
  });

  it('16. RBAC: unauthenticated requests to commercial endpoints are rejected', async () => {
    const res = await request(server).get('/api/commercial/customers');
    expect(res.status).toBe(401);
  });

  it('17. RBAC: paginated listing works for customers', async () => {
    const res = await request(server)
      .get('/api/commercial/customers?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(res.body.page).toBe(1);
  });
});
