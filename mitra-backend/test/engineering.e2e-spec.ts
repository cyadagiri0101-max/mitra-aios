import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';

/**
 * Engineering Domain E2E (Sprint 2.3):
 * Exercises drawings, BOMs (tree/cost), routings, materials, components,
 * reviews, documents, ECR/ECO/ECN, traceability, dashboard and DB-driven
 * workflows over HTTP. Migration 0017 is applied in beforeAll so the
 * engineering schema + workflow seeds exist in the test database.
 */
describe('Engineering Module E2E', () => {
  let app: INestApplication;
  let server: any;
  let accessToken: string;
  let projectId: string;
  let drawingId: string;
  let bomId: string;
  let routingId: string;
  let reviewId: string;
  let documentId: string;
  let ecrId: string;
  let ecoId: string;
  let ecnId: string;

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  beforeAll(async () => {
    ({ app } = await createTestApp());
    server = app.getHttpServer();
    const dataSource = app.get(DataSource);
    await dataSource.runMigrations();
    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(login.status).toBe(200);
    accessToken = login.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Creates a project (base for no-orphan engineering records)', async () => {
    const res = await request(server)
      .post('/api/project')
      .set(auth())
      .send({
        name: 'E2E Engineering Project',
        customerName: 'E2E Customer',
        productName: 'Housing Part',
        moldType: 'INJECTION',
        cavitation: 2,
        materialType: 'P20',
        projectValue: 1500000,
      });
    expect(res.status).toBe(201);
    expect(res.body.projectNumber).toMatch(/^PRJ-\d{4}-\d{4}$/);
    projectId = res.body.id;
  });

  it('2. Creates a drawing and walks the DB-driven workflow', async () => {
    const res = await request(server)
      .post('/api/engineering/drawings')
      .set(auth())
      .send({ projectId, title: 'Core Insert', drawingType: 'PART', partNumber: 'P-100' });
    expect(res.status).toBe(201);
    expect(res.body.drawingNumber).toMatch(/^DRW-\d{4}-\d{4}$/);
    expect(res.body.status).toBe('DRAFT');
    drawingId = res.body.id;

    const wf = await request(server)
      .get(`/api/engineering/drawing/${drawingId}/workflow`)
      .set(auth());
    expect(wf.status).toBe(200);
    expect(wf.body.currentState.stateCode).toBe('DRAFT');
    expect(wf.body.availableTransitions.length).toBeGreaterThan(0);

    const first = wf.body.availableTransitions[0];
    const t = await request(server)
      .post(`/api/engineering/drawing/${drawingId}/workflow/transition`)
      .set(auth())
      .send({ transitionId: first.id, remarks: 'e2e start design' });
    expect(t.status).toBe(200);
    expect(t.body.transition.to).toBe('IN_DESIGN');

    const updated = await request(server)
      .get(`/api/engineering/drawings/${drawingId}`)
      .set(auth());
    expect(updated.body.status).toBe('IN_DESIGN');
  });

  it('3. Check-out / check-in creates an immutable revision', async () => {
    const co = await request(server)
      .post(`/api/engineering/drawings/${drawingId}/checkout`)
      .set(auth())
      .send({});
    expect(co.status).toBe(201);
    expect(co.body.checkedOutBy).toBeDefined();

    const ci = await request(server)
      .post(`/api/engineering/drawings/${drawingId}/revisions`)
      .set(auth())
      .send({ revision: 'B', changeSummary: 'Fillet radius updated' });
    expect(ci.status).toBe(201);
    expect(ci.body.revision.revision).toBe('B');

    const revs = await request(server)
      .get(`/api/engineering/drawings/${drawingId}/revisions`)
      .set(auth());
    expect(revs.status).toBe(200);
    expect(revs.body.length).toBe(1);
  });

  it('4. Builds a BOM with items, tree and cost roll-up', async () => {
    const res = await request(server)
      .post('/api/engineering/boms')
      .set(auth())
      .send({ projectId, name: 'Core Assembly', drawingId, revisionCode: 'B' });
    expect(res.status).toBe(201);
    expect(res.body.bomNumber).toMatch(/^BOM-\d{4}-\d{4}$/);
    bomId = res.body.id;

    const parent = await request(server)
      .post(`/api/engineering/boms/${bomId}/items`)
      .set(auth())
      .send({ partNumber: 'SUB-001', partName: 'Sub assembly', itemType: 'SUB_ASSEMBLY', quantityPer: 1 });
    expect(parent.status).toBe(201);

    const second = await request(server)
      .post(`/api/engineering/boms/${bomId}/items`)
      .set(auth())
      .send({ parentItemId: parent.body.id, partNumber: 'P-200', partName: 'Screw M6', quantityPer: 4, unitCost: 1.5 });
    expect(second.status).toBe(201);

    const tree = await request(server)
      .get(`/api/engineering/boms/${bomId}/tree`)
      .set(auth());
    expect(tree.status).toBe(200);
    expect(tree.body.length).toBeGreaterThan(0);
    expect(tree.body[0].children.length).toBeGreaterThan(0);

    const cost = await request(server)
      .get(`/api/engineering/boms/${bomId}/cost`)
      .set(auth());
    expect(cost.status).toBe(200);
    expect(cost.body.totalCost).toBe(6);

    const csv = await request(server)
      .get(`/api/engineering/boms/${bomId}/export`)
      .set(auth());
    expect(csv.status).toBe(200);
    expect(csv.text).toContain('P-200');
  });

  it('5. Creates work center, routing and operations', async () => {
    const wc = await request(server)
      .post('/api/engineering/work-centers')
      .set(auth())
      .send({ projectId, code: 'CNC-01', name: 'CNC Machining', type: 'CNC', hourlyRate: 850 });
    expect(wc.status).toBe(201);

    const rtg = await request(server)
      .post('/api/engineering/routings')
      .set(auth())
      .send({ projectId, routingName: 'Core Insert Process', bomId });
    expect(rtg.status).toBe(201);
    expect(rtg.body.routingNumber).toMatch(/^RTG-\d{4}-\d{4}$/);
    routingId = rtg.body.id;

    const op = await request(server)
      .post(`/api/engineering/routings/${routingId}/operations`)
      .set(auth())
      .send({ sequence: 10, operationName: 'Rough milling', workCenterId: wc.body.id, setupTimeMinutes: 30, cycleTimeMinutes: 45 });
    expect(op.status).toBe(201);

    const withOps = await request(server)
      .get(`/api/engineering/routings/${routingId}/with-operations`)
      .set(auth());
    expect(withOps.status).toBe(200);
    expect(withOps.body.operations.length).toBe(1);
  });

  it('6. Registers material and component libraries with alternates', async () => {
    const mat = await request(server)
      .post('/api/engineering/materials')
      .set(auth())
      .send({ projectId, materialCode: 'MAT-P20', materialName: 'P20 Tool Steel', category: 'STEEL', grade: 'P20', density: 7.85 });
    expect(mat.status).toBe(201);
    expect(mat.body.materialCode).toBe('MAT-P20');

    const comp = await request(server)
      .post('/api/engineering/components')
      .set(auth())
      .send({ projectId, componentCode: 'CMP-EJ-01', componentName: 'Ejector Pin', componentType: 'STANDARD', manufacturer: 'DME', unitCost: 45 });
    expect(comp.status).toBe(201);

    const alt = await request(server)
      .post('/api/engineering/components')
      .set(auth())
      .send({ projectId, componentCode: 'CMP-EJ-02', componentName: 'Ejector Pin (Alt)', componentType: 'STANDARD', manufacturer: 'Hasco' });
    const altLink = await request(server)
      .post(`/api/engineering/components/${comp.body.id}/alternates`)
      .set(auth())
      .send({ alternateComponentId: alt.body.id, isApproved: true });
    expect(altLink.status).toBe(201);
  });

  it('7. Creates a review request, comments and decision', async () => {
    const res = await request(server)
      .post('/api/engineering/reviews')
      .set(auth())
      .send({ projectId, entityType: 'drawing', entityId: drawingId, reviewType: 'PEER_REVIEW', title: 'Peer review drawing B', description: 'Check draft angles' });
    expect(res.status).toBe(201);
    expect(res.body.reviewNumber).toMatch(/^RVR-\d{4}-\d{4}$/);
    reviewId = res.body.id;

    const comment = await request(server)
      .post(`/api/engineering/reviews/${reviewId}/comments`)
      .set(auth())
      .send({ comment: 'Increase draft angle to 2 degrees' });
    expect(comment.status).toBe(201);

    const decision = await request(server)
      .post(`/api/engineering/reviews/${reviewId}/decide`)
      .set(auth())
      .send({ decision: 'APPROVE', comment: 'Looks good' });
    expect(decision.status).toBe(200);
    expect(decision.body.status).toBe('APPROVED');
  });

  it('8. Creates a document and adds an immutable version', async () => {
    const res = await request(server)
      .post('/api/engineering/documents')
      .set(auth())
      .send({ projectId, title: 'Material Specification', docType: 'SPECIFICATION', tags: ['material', 'p20'] });
    expect(res.status).toBe(201);
    expect(res.body.documentNumber).toMatch(/^EDOC-\d{4}-\d{4}$/);
    documentId = res.body.id;

    const ver = await request(server)
      .post(`/api/engineering/documents/${documentId}/versions`)
      .set(auth())
      .send({ versionCode: 'A', fileName: 'spec-p20.pdf', changeSummary: 'Initial spec' });
    expect(ver.status).toBe(201);
    expect(ver.body.documentId).toBe(documentId);
  });

  it('9. Drives ECR → impact → ECO → ECN lifecycle', async () => {
    const ecr = await request(server)
      .post('/api/engineering-changes/ecr')
      .set(auth())
      .send({ projectId, title: 'Wall thickness change', changeType: 'DESIGN', priority: 'HIGH', changeDescription: 'Increase wall thickness from 2.0 to 2.5 mm', changeReason: 'Customer requested thicker wall section' });
    expect(ecr.status).toBe(201);
    expect(ecr.body.ecrNumber).toMatch(/^ECR-\d{4}-\d{4}$/);
    ecrId = ecr.body.id;

    const impact = await request(server)
      .post(`/api/engineering-changes/ecr/${ecrId}/impacts`)
      .set(auth())
      .send({ impactType: 'DRAWING', entityId: drawingId, severity: 'HIGH', impactDescription: 'Drawing B must change' });
    expect(impact.status).toBe(201);

    const impacts = await request(server)
      .get(`/api/engineering-changes/ecr/${ecrId}/impacts`)
      .set(auth());
    expect(impacts.body.length).toBe(1);

    const wf = await request(server)
      .get(`/api/engineering-changes/ecr/${ecrId}/workflow`)
      .set(auth());
    expect(wf.body.currentState.stateCode).toBe('REQUEST');
    const first = wf.body.availableTransitions[0];
    const t = await request(server)
      .post(`/api/engineering-changes/ecr/${ecrId}/workflow/transition`)
      .set(auth())
      .send({ transitionId: first.id, remarks: 'submit' });
    expect(t.status).toBe(200);
    expect(t.body.transition.to).toBe('REVIEW');

    const eco = await request(server)
      .post('/api/engineering-changes/eco')
      .set(auth())
      .send({ ecrId, projectId, implementationPlan: 'Update drawing B and BOM' });
    expect(eco.status).toBe(201);
    expect(eco.body.ecoNumber).toMatch(/^ECO-\d{4}-\d{4}$/);
    ecoId = eco.body.id;

    const ecn = await request(server)
      .post(`/api/engineering-changes/eco/${ecoId}/ecn`)
      .set(auth())
      .send({ title: 'Notify shop floor', affectedManufacturingOrders: null });
    expect(ecn.status).toBe(201);
    expect(ecn.body.ecnNumber).toMatch(/^ECN-\d{4}-\d{4}$/);
    expect(ecn.body.status).toBe('ISSUED');
    ecnId = ecn.body.id;
  });

  it('10. Engineering traceability, dashboard and AI hook registry', async () => {
    const trace = await request(server)
      .get(`/api/engineering/traceability/project/${projectId}`)
      .set(auth());
    expect(trace.status).toBe(200);
    expect(trace.body.drawings.length).toBeGreaterThanOrEqual(1);
    expect(trace.body.boms.length).toBeGreaterThanOrEqual(1);
    expect(trace.body.changes.requests.length).toBeGreaterThanOrEqual(1);

    const dash = await request(server)
      .get('/api/engineering/dashboard/stats')
      .set(auth());
    expect(dash.status).toBe(200);
    expect(dash.body.totals.drawings).toBeGreaterThanOrEqual(1);
    expect(dash.body.totals.boms).toBeGreaterThanOrEqual(1);

    const hooks = await request(server)
      .get('/api/engineering/ai-hooks')
      .set(auth());
    expect(hooks.status).toBe(200);
    expect(hooks.body.data.length).toBeGreaterThanOrEqual(8);
  });
});
