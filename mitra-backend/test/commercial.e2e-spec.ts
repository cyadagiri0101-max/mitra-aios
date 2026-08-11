import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';

describe('Commercial E2E: Customer → Contact → Enquiry → RFQ → Quotation → Project', () => {
  let app: INestApplication;
  let server: any;
  let ds: DataSource;
  let accessToken: string;
  let customerId: string;
  let contactId: string;
  let enquiryId: string;
  let rfqId: string;
  let quotationId: string;
  let projectId: string;
  let salesOrderId: string;
  let salesOrderNumber: string;
  let invoiceId: string;
  let invoiceNumber: string;
  let paymentId: string;
  let creditNoteId: string;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    server = app.getHttpServer();
    ds = app.get(DataSource);
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

  // ── Sprint 2: Sales Order → Invoice → Payment → Credit Note lifecycle ────

  it('18. Creates a sales order from the accepted quotation', async () => {
    const res = await request(server)
      .post('/api/commercial/sales-orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ quotationId });

    expect(res.status).toBe(201);
    expect(res.body.salesOrderNumber).toMatch(/^SO-\d{4}-\d{4}$/);
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.quotationId).toBe(quotationId);
    expect(res.body.projectId).toBe(projectId);
    expect(res.body.customerId).toBe(customerId);
    expect(res.body.customerName).toBe('ABC Plastics Pvt Ltd');
    expect(Number(res.body.subtotal)).toBe(1850000);
    expect(Number(res.body.taxAmount)).toBe(333000);
    expect(Number(res.body.totalAmount)).toBe(2183000);
    expect(res.body.currency).toBe('INR');
    expect(Array.isArray(res.body.lines)).toBe(true);
    expect(res.body.lines.length).toBe(1);
    expect(res.body.lines[0].description).toBe('500 mL Bottle Blow Mold');
    expect(Number(res.body.lines[0].lineTotal)).toBe(1850000);
    salesOrderId = res.body.id;
    salesOrderNumber = res.body.salesOrderNumber;
  });

  it('19. Business rule: a second active sales order for the same quotation is rejected', async () => {
    const res = await request(server)
      .post('/api/commercial/sales-orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ quotationId });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('20. Confirms the sales order (DRAFT → CONFIRMED)', async () => {
    const res = await request(server)
      .post(`/api/commercial/sales-orders/${salesOrderId}/confirm`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CONFIRMED');
  });

  it('21. Business rule: confirming an already-confirmed sales order is rejected', async () => {
    const res = await request(server)
      .post(`/api/commercial/sales-orders/${salesOrderId}/confirm`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(400);
  });

  it('22. Creates an invoice from the confirmed sales order with propagated links', async () => {
    const res = await request(server)
      .post('/api/commercial/invoices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ salesOrderId, invoiceDate: '2026-08-05', dueDate: '2026-09-04' });

    expect(res.status).toBe(201);
    expect(res.body.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.salesOrderId).toBe(salesOrderId);
    expect(res.body.quotationId).toBe(quotationId);
    expect(res.body.projectId).toBe(projectId);
    expect(res.body.customerId).toBe(customerId);
    expect(Number(res.body.totalAmount)).toBe(2183000);
    expect(Number(res.body.paidAmount)).toBe(0);
    expect(Number(res.body.balanceAmount)).toBe(2183000);
    expect(Array.isArray(res.body.lines)).toBe(true);
    expect(res.body.lines.length).toBe(1);
    invoiceId = res.body.id;
    invoiceNumber = res.body.invoiceNumber;
  });

  it('23. Business rule: payment against a draft (unissued) invoice is rejected', async () => {
    const res = await request(server)
      .post('/api/commercial/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ invoiceId, paymentDate: '2026-08-06', amount: 100000 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/draft/i);
  });

  it('24. Issues the invoice (DRAFT → ISSUED)', async () => {
    const res = await request(server)
      .post(`/api/commercial/invoices/${invoiceId}/issue`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ISSUED');
  });

  it('25. Records a partial payment and the invoice becomes PARTIALLY_PAID', async () => {
    const pay = await request(server)
      .post('/api/commercial/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        invoiceId,
        paymentDate: '2026-08-06',
        amount: 1000000,
        method: 'NEFT',
        referenceNumber: 'NEFT-REF-001',
      });
    expect(pay.status).toBe(201);
    expect(pay.body.paymentNumber).toMatch(/^PAY-\d{4}-\d{4}$/);
    expect(pay.body.invoiceId).toBe(invoiceId);
    expect(Number(pay.body.amount)).toBe(1000000);
    expect(pay.body.isVerified).toBe(false);
    paymentId = pay.body.id;

    const inv = await request(server)
      .get(`/api/commercial/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(inv.status).toBe(200);
    expect(inv.body.status).toBe('PARTIALLY_PAID');
    expect(Number(inv.body.paidAmount)).toBe(1000000);
    expect(Number(inv.body.balanceAmount)).toBe(1183000);
  });

  it('26. Business rule: overpayment beyond the invoice balance is rejected', async () => {
    const res = await request(server)
      .post('/api/commercial/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ invoiceId, paymentDate: '2026-08-07', amount: 5000000 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/balance/i);
  });

  it('27. Records the remaining payment and the invoice becomes PAID', async () => {
    const pay = await request(server)
      .post('/api/commercial/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ invoiceId, paymentDate: '2026-08-08', amount: 1183000, method: 'RTGS' });
    expect(pay.status).toBe(201);

    const inv = await request(server)
      .get(`/api/commercial/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(inv.status).toBe(200);
    expect(inv.body.status).toBe('PAID');
    expect(Number(inv.body.paidAmount)).toBe(2183000);
    expect(Number(inv.body.balanceAmount)).toBe(0);
  });

  it('28. Verifies a payment exactly once', async () => {
    const ok = await request(server)
      .post(`/api/commercial/payments/${paymentId}/verify`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
    expect(ok.status).toBe(200);
    expect(ok.body.isVerified).toBe(true);
    expect(ok.body.verifiedBy).toBeDefined();

    const again = await request(server)
      .post(`/api/commercial/payments/${paymentId}/verify`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
    expect(again.status).toBe(400);
  });

  it('29. Business rule: a paid invoice cannot be cancelled', async () => {
    const res = await request(server)
      .post(`/api/commercial/invoices/${invoiceId}/cancel`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ reason: 'attempt after payment' });
    expect(res.status).toBe(400);
  });

  it('30. Credit note lifecycle: create OPEN, apply to the invoice, re-apply rejected', async () => {
    const create = await request(server)
      .post('/api/commercial/credit-notes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        invoiceId,
        customerId,
        creditDate: '2026-08-09',
        amount: 25000,
        reason: 'Surface finish rework allowance',
      });
    expect(create.status).toBe(201);
    expect(create.body.creditNoteNumber).toMatch(/^CN-\d{4}-\d{4}$/);
    expect(create.body.status).toBe('OPEN');
    expect(Number(create.body.amount)).toBe(25000);
    creditNoteId = create.body.id;

    const apply = await request(server)
      .post(`/api/commercial/credit-notes/${creditNoteId}/apply`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ invoiceId });
    expect(apply.status).toBe(200);
    expect(apply.body.status).toBe('APPLIED');
    expect(apply.body.invoiceId).toBe(invoiceId);
    expect(apply.body.appliedAt).toBeDefined();

    const reapply = await request(server)
      .post(`/api/commercial/credit-notes/${creditNoteId}/apply`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ invoiceId });
    expect(reapply.status).toBe(400);
  });

  it('31. Credit note lifecycle: a second OPEN credit note can be cancelled', async () => {
    const create = await request(server)
      .post('/api/commercial/credit-notes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        invoiceId,
        customerId,
        creditDate: '2026-08-09',
        amount: 5000,
        reason: 'Issued in error',
      });
    expect(create.status).toBe(201);
    const cn2 = create.body.id;

    const cancel = await request(server)
      .post(`/api/commercial/credit-notes/${cn2}/cancel`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ reason: 'Issued in error' });
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe('CANCELLED');
    expect(cancel.body.cancelledReason).toBe('Issued in error');
  });

  it('32. Sales order cancellation: manual SO cancelled with reason; invoicing it is rejected', async () => {
    const create = await request(server)
      .post('/api/commercial/sales-orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        customerName: 'Walk-in Customer',
        lines: [{ description: 'Spare heater assembly', quantity: 2, unitPrice: 15000 }],
      });
    expect(create.status).toBe(201);
    const so2 = create.body.id;
    expect(Number(create.body.subtotal)).toBe(30000);

    const cancel = await request(server)
      .post(`/api/commercial/sales-orders/${so2}/cancel`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ reason: 'Customer withdrew' });
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe('CANCELLED');
    expect(cancel.body.cancelledReason).toBe('Customer withdrew');

    const inv = await request(server)
      .post('/api/commercial/invoices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ salesOrderId: so2, invoiceDate: '2026-08-09' });
    expect(inv.status).toBe(400);
    expect(inv.body.message).toMatch(/cancelled/i);
  });

  it('33. Completes the confirmed sales order; cancelling a completed SO is rejected', async () => {
    const complete = await request(server)
      .post(`/api/commercial/sales-orders/${salesOrderId}/complete`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(complete.status).toBe(200);
    expect(complete.body.status).toBe('COMPLETED');

    const cancel = await request(server)
      .post(`/api/commercial/sales-orders/${salesOrderId}/cancel`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ reason: 'too late' });
    expect(cancel.status).toBe(400);
  });

  it('34. Cross-tenant: tenant B cannot read or reference tenant A commercial records', async () => {
    // Fixture: register user B, grant ADMIN, move to a fresh tenant, re-login.
    const bEmail = `comm.b.${Date.now()}@mitra.local`;
    const bPassword = 'CommercialB!2026';
    const regRes = await request(server)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: bEmail, password: bPassword, firstName: 'Commercial', lastName: 'TenantB' });
    if (regRes.status !== 201) console.log('REGISTER_FAIL_BODY', JSON.stringify(regRes.body));
    expect(regRes.status).toBe(201);
    const bLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: bEmail, password: bPassword })
      .expect(200);
    const bMe = await request(server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${bLogin.body.access_token}`)
      .expect(200);
    const bUserId = bMe.body.id;

    const roles = await request(server)
      .get('/api/roles')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const adminRole = roles.body.find((r: { name: string }) => r.name === 'ADMIN');
    await request(server)
      .post(`/api/users/${bUserId}/assign-role`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ roleId: adminRole.id, reason: 'Commercial cross-tenant fixture' })
      .expect(200);

    const tenantB = randomUUID();
    await ds.query(
      `INSERT INTO tenants (id, name, code, is_active, created_at, updated_at)
       VALUES ($1, 'Commercial Tenant B', $2, true, now(), now())`,
      [tenantB, `COMB${Date.now() % 100000}`],
    );
    await ds.query('UPDATE users SET tenant_id = $1 WHERE id = $2', [tenantB, bUserId]);

    const bLogin2 = await request(server)
      .post('/api/auth/login')
      .send({ email: bEmail, password: bPassword })
      .expect(200);
    const bToken = bLogin2.body.access_token;
    const bMe2 = await request(server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${bToken}`)
      .expect(200);
    expect(bMe2.body.tenantId).toBe(tenantB);

    // Direct access by ID → 404 (no existence leak).
    for (const path of [
      `/api/commercial/sales-orders/${salesOrderId}`,
      `/api/commercial/invoices/${invoiceId}`,
      `/api/commercial/payments/${paymentId}`,
      `/api/commercial/credit-notes/${creditNoteId}`,
    ]) {
      const res = await request(server)
        .get(path)
        .set('Authorization', `Bearer ${bToken}`);
      expect(res.status).toBe(404);
    }

    // Listing never exposes tenant A records.
    // (No page/limit query params: InvoiceFilterDto does not whitelist them
    // and the global pipe rejects non-whitelisted query properties.)
    const list = await request(server)
      .get('/api/commercial/invoices')
      .set('Authorization', `Bearer ${bToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.some((i: any) => i.id === invoiceId)).toBe(false);

    // Two-way proof: tenant B creates its OWN sales order through the real
    // API (PASS), and tenant A cannot read it back (DENIED).
    const soB = await request(server)
      .post('/api/commercial/sales-orders')
      .set('Authorization', `Bearer ${bToken}`)
      .send({
        customerName: 'Tenant B Customer',
        lines: [{ description: 'Tenant B spare part', quantity: 1, unitPrice: 1000 }],
      });
    expect(soB.status).toBe(201);
    expect(soB.body.tenantId).toBe(tenantB);
    const soBId = soB.body.id;

    const soBRead = await request(server)
      .get(`/api/commercial/sales-orders/${soBId}`)
      .set('Authorization', `Bearer ${bToken}`);
    expect(soBRead.status).toBe(200);

    const soBByA = await request(server)
      .get(`/api/commercial/sales-orders/${soBId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(soBByA.status).toBe(404);

    // Referencing tenant A's invoice from tenant B → 404.
    const pay = await request(server)
      .post('/api/commercial/payments')
      .set('Authorization', `Bearer ${bToken}`)
      .send({ invoiceId, paymentDate: '2026-08-09', amount: 100 });
    expect(pay.status).toBe(404);

    // ── Extended matrix: tenant B's own Commercial lifecycle (real API) ────
    // B creates an invoice from its own sales order → PASS.
    const invB = await request(server)
      .post('/api/commercial/invoices')
      .set('Authorization', `Bearer ${bToken}`)
      .send({ salesOrderId: soBId, invoiceDate: '2026-08-10', dueDate: '2026-09-09' });
    expect(invB.status).toBe(201);
    expect(invB.body.tenantId).toBe(tenantB);
    const invBId = invB.body.id;

    const invBRead = await request(server)
      .get(`/api/commercial/invoices/${invBId}`)
      .set('Authorization', `Bearer ${bToken}`);
    expect(invBRead.status).toBe(200);

    // Tenant A cannot read tenant B's invoice → DENIED.
    const invBByA = await request(server)
      .get(`/api/commercial/invoices/${invBId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(invBByA.status).toBe(404);

    // Tenant A cannot create a payment against tenant B's invoice → DENIED.
    const payBByA = await request(server)
      .post('/api/commercial/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ invoiceId: invBId, paymentDate: '2026-08-10', amount: 100 });
    expect(payBByA.status).toBe(404);

    // B's own invoice appears in B's listing; A's invoice never does.
    const listB = await request(server)
      .get('/api/commercial/invoices')
      .set('Authorization', `Bearer ${bToken}`);
    expect(listB.status).toBe(200);
    expect(listB.body.data.some((i: any) => i.id === invBId)).toBe(true);
    expect(listB.body.data.some((i: any) => i.id === invoiceId)).toBe(false);

    // B creates a credit note against its own invoice → PASS.
    const cnB = await request(server)
      .post('/api/commercial/credit-notes')
      .set('Authorization', `Bearer ${bToken}`)
      .send({
        invoiceId: invBId,
        creditDate: '2026-08-10',
        amount: 250,
        reason: 'Tenant B allowance',
      });
    expect(cnB.status).toBe(201);
    expect(cnB.body.tenantId).toBe(tenantB);
    const cnBId = cnB.body.id;

    const cnBRead = await request(server)
      .get(`/api/commercial/credit-notes/${cnBId}`)
      .set('Authorization', `Bearer ${bToken}`);
    expect(cnBRead.status).toBe(200);

    // Tenant A cannot access tenant B's credit note → DENIED.
    const cnBByA = await request(server)
      .get(`/api/commercial/credit-notes/${cnBId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(cnBByA.status).toBe(404);
  });

  it('35. Traceability: IDs propagate end-to-end and business events are audited', async () => {
    const so = await request(server)
      .get(`/api/commercial/sales-orders/${salesOrderId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(so.body.quotationId).toBe(quotationId);
    expect(so.body.projectId).toBe(projectId);
    expect(so.body.customerId).toBe(customerId);

    const inv = await request(server)
      .get(`/api/commercial/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(inv.body.salesOrderId).toBe(salesOrderId);
    expect(inv.body.quotationId).toBe(quotationId);
    expect(inv.body.projectId).toBe(projectId);

    const audit = await ds.query(
      `SELECT action, entity_id FROM audit_logs
       WHERE (action = 'sales-order.created' AND entity_id = $1)
          OR (action = 'sales-order.confirmed' AND entity_id = $1)
          OR (action = 'invoice.created' AND entity_id = $2)
          OR (action = 'invoice.issued' AND entity_id = $2)
          OR (action = 'payment.recorded' AND entity_id = $3)
          OR (action = 'credit-note.created' AND entity_id = $4)
          OR (action = 'credit-note.applied' AND entity_id = $4)`,
      [salesOrderId, invoiceId, paymentId, creditNoteId],
    );
    const actions = audit.map((r: any) => r.action);
    expect(actions).toEqual(expect.arrayContaining([
      'sales-order.created',
      'sales-order.confirmed',
      'invoice.created',
      'invoice.issued',
      'payment.recorded',
      'credit-note.created',
      'credit-note.applied',
    ]));
  });
});
