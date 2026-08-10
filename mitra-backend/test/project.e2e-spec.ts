import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';

/**
 * Project Module E2E (X-1):
 * Exercises the full project domain over HTTP — CRUD, milestones, tasks
 * (incl. time logging), teams (incl. skill filter), stage transitions and
 * activity/audit trail. Runs against the seeded mitra_v2_test database.
 */
describe('Project Module E2E', () => {
  let app: INestApplication;
  let server: any;
  let accessToken: string;
  let projectId: string;
  let milestoneId: string;
  let taskId: string;
  let otherTaskId: string;
  let teamId: string;

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

  it('1. Creates a project with sequential numbering', async () => {
    const res = await request(server)
      .post('/api/project')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'E2E Mold Project',
        customerName: 'E2E Customer',
        productName: 'Housing Part',
        moldType: 'INJECTION',
        cavitation: 2,
        materialType: 'P20',
        projectValue: 1500000,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.projectNumber).toMatch(/^PRJ-\d{4}-\d{4}$/);
    expect(res.body.stage).toBe('ENQUIRY');
    expect(res.body.healthStatus).toBe('GREEN');
    projectId = res.body.id;
  });

  it('2. Fetches the project with its workflow state', async () => {
    const res = await request(server)
      .get(`/api/project/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(projectId);

    const wf = await request(server)
      .get(`/api/project/${projectId}/workflow`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(wf.status).toBe(200);
    expect(wf.body.currentState).toBeDefined();
  });

  it('3. Lists projects with pagination', async () => {
    const res = await request(server)
      .get('/api/project?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.total).toBe('number');
  });

  it('4. Creates a milestone and completes it', async () => {
    const res = await request(server)
      .post(`/api/project/${projectId}/milestones`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Design Freeze',
        plannedDate: '2026-09-01',
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    milestoneId = res.body.id;

    const done = await request(server)
      .post(`/api/project/${projectId}/milestones/${milestoneId}/complete`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(done.status).toBe(200);
    expect(done.body.status).toBe('COMPLETED');
  });

  it('5. Creates tasks and logs time against them (T-3)', async () => {
    const res = await request(server)
      .post(`/api/project/${projectId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Cavity machining', estimatedHours: 40 });
    expect(res.status).toBe(201);
    taskId = res.body.id;
    expect(res.body.actualHours).toBe(0);

    const other = await request(server)
      .post(`/api/project/${projectId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Mold base assembly', estimatedHours: 20 });
    otherTaskId = other.body.id;

    const log = await request(server)
      .post(`/api/project/${projectId}/tasks/${taskId}/time`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ hours: 8.5, note: 'roughing' });
    expect(log.status).toBe(200);
    expect(log.body.actualHours).toBe(8.5);

    const log2 = await request(server)
      .post(`/api/project/${projectId}/tasks/${taskId}/time`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ hours: 2, note: 'finishing' });
    expect(log2.body.actualHours).toBe(10.5);
  });

  it('6. Dependency rule: DONE is blocked until the dependency completes', async () => {
    await request(server)
      .post(`/api/project/${projectId}/tasks/${taskId}/dependencies`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dependsOnTaskId: otherTaskId })
      .expect(201);

    const blocked = await request(server)
      .post(`/api/project/${projectId}/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'DONE' });
    expect(blocked.status).toBe(400);
    expect(blocked.body.message).toMatch(/dependenc/i);

    await request(server)
      .post(`/api/project/${projectId}/tasks/${otherTaskId}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'DONE' })
      .expect(200);

    const ok = await request(server)
      .post(`/api/project/${projectId}/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'DONE' });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('DONE');
  });

  it('7. Creates a team with members carrying skills and filters by skill (TM-1)', async () => {
    const res = await request(server)
      .post(`/api/project/${projectId}/teams`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Design Team', role: 'DESIGN' });
    expect(res.status).toBe(201);
    teamId = res.body.id;

    const member = await request(server)
      .post(`/api/project/${projectId}/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        userId: null,
        name: 'Designer One',
        email: 'designer1@mitra.local',
        role: 'DESIGN_ENGINEER',
        skills: ['Cavity Design', 'Moldflow'],
      });
    expect(member.status).toBe(201);
    expect(member.body.skills).toEqual(['Cavity Design', 'Moldflow']);

    const bySkill = await request(server)
      .get(`/api/project/${projectId}/teams?skill=moldflow`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(bySkill.status).toBe(200);
    expect(bySkill.body.data.some((m: any) => m.name === 'Designer One')).toBe(true);
  });

  it('8. Transitions the project stage (legacy path) with audit trail', async () => {
    const res = await request(server)
      .post(`/api/project/${projectId}/transition`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ toStage: 'PROJECT_CREATED', remarks: 'e2e stage move' });
    expect(res.status).toBe(200);
    expect(res.body.project.stage).toBe('PROJECT_CREATED');

    const activity = await request(server)
      .get(`/api/project/${projectId}/activity`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(activity.status).toBe(200);
    const types = (activity.body.data ?? activity.body).map((a: any) => a.activityType);
    expect(types).toContain('project.stage_changed');
    expect(types).toContain('project.created');
  });

  it('9. Validation: rejects unknown fields (whitelist + forbidNonWhitelisted)', async () => {
    const res = await request(server)
      .post('/api/project')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Invalid Project',
        customerName: 'X',
        productName: 'Y',
        tenantId: 'hacker-tenant',
      });
    expect(res.status).toBe(400);
  });

  it('10. RBAC: project endpoints require authentication', async () => {
    const res = await request(server).get('/api/project');
    expect(res.status).toBe(401);
  });

  it('11. Soft-deletes the project (cascade) and it disappears from listings', async () => {
    const del = await request(server)
      .delete(`/api/project/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(del.status).toBe(200);
    expect(del.body.deleted).toBe(true);

    const list = await request(server)
      .get('/api/project?limit=100')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(list.body.data.some((p: any) => p.id === projectId)).toBe(false);
  });
});
