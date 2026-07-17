import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { createTestApp } from './utils/test-app';

const ADMIN_EMAIL = 'admin@mitra.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let adminAccessToken: string;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('rejects an unknown email', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: 'nobody@mitra.local', password: 'whatever123' });
      expect(res.status).toBe(401);
    });

    it('rejects the wrong password for a known user', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: ADMIN_EMAIL, password: 'totally-wrong-password' });
      expect(res.status).toBe(401);
    });

    it('logs in with valid credentials and returns a token pair without the password hash', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

      expect(res.status).toBe(200);
      expect(typeof res.body.access_token).toBe('string');
      expect(typeof res.body.refresh_token).toBe('string');
      expect(res.body.refresh_token.length).toBeGreaterThanOrEqual(96);
      expect(res.body.user.email).toBe(ADMIN_EMAIL);
      expect(res.body.user.role).toBe('ADMIN');

      // Sensitive fields must never be serialized
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user.refreshTokenHash).toBeUndefined();

      adminAccessToken = res.body.access_token;
    });
  });

  describe('GET /api/auth/me', () => {
    it('rejects a request with no token', async () => {
      const res = await request(server).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('rejects a malformed/garbage token', async () => {
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-real-jwt');
      expect(res.status).toBe(401);
    });

    it('returns the current user profile for a valid access token', async () => {
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(ADMIN_EMAIL);
      expect(res.body.role).toBe('ADMIN');
      expect(Array.isArray(res.body.permissions)).toBe(true);
      expect(res.body.permissions.length).toBeGreaterThan(0);
      expect(typeof res.body.tenantId).toBe('string');
    });
  });

  describe('POST /api/auth/refresh — rotation', () => {
    it('exchanges a refresh token for a new pair and invalidates the old one', async () => {
      const login = await request(server)
        .post('/api/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      expect(login.status).toBe(200);
      const firstRefresh: string = login.body.refresh_token;

      // First refresh — should succeed and return a NEW pair
      const refreshed = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken: firstRefresh });

      expect(refreshed.status).toBe(200);
      expect(typeof refreshed.body.access_token).toBe('string');
      expect(typeof refreshed.body.refresh_token).toBe('string');
      expect(refreshed.body.refresh_token).not.toBe(firstRefresh);
      // Note: access_token MAY be byte-identical to the previous one if both
      // were issued within the same wall-clock second — JWT `iat` has
      // 1-second resolution and HS256 signing is deterministic for an
      // identical header+payload+secret. This is expected JWT behaviour,
      // not a bug; both tokens are independently valid for their window.

      // New access token must work
      const me = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${refreshed.body.access_token}`);
      expect(me.status).toBe(200);
      expect(me.body.email).toBe(ADMIN_EMAIL);

      // Re-using the OLD (already-rotated) refresh token must now fail —
      // this is the replay-detection behaviour described in AuthService.
      const replay = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken: firstRefresh });
      expect(replay.status).toBe(401);

      // The brand-new refresh token must still work (only the old one is dead)
      const secondRefresh = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken: refreshed.body.refresh_token });
      expect(secondRefresh.status).toBe(200);
    });

    it('rejects a malformed refresh token', async () => {
      const res = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'too-short' });
      expect(res.status).toBe(401);
    });

    it('rejects a well-formed but unknown refresh token', async () => {
      const fake = 'a'.repeat(96);
      const res = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken: fake });
      expect(res.status).toBe(401);
    });
  });

  describe('Account lockout after repeated failed logins', () => {
    const email = `lockout.${Date.now()}@mitra.local`;
    const password = 'CorrectPass123!';

    beforeAll(async () => {
      // Use the admin token to create a dedicated user for this test so we
      // never lock out the shared admin account used elsewhere.
      const res = await request(server)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ email, password, firstName: 'Lock', lastName: 'Out' });
      expect(res.status).toBe(201);
    });

    it('locks the account after 5 failed attempts and rejects even the correct password', async () => {
      for (let i = 0; i < 5; i++) {
        const res = await request(server)
          .post('/api/auth/login')
          .send({ email, password: 'wrong-password' });
        expect(res.status).toBe(401);
      }

      // 6th attempt — even with the CORRECT password — must be rejected
      // because the account is now locked.
      const locked = await request(server)
        .post('/api/auth/login')
        .send({ email, password });
      expect(locked.status).toBe(401);
      expect(locked.body.message).toMatch(/locked/i);
    });
  });

  describe('POST /api/auth/register — admin-only', () => {
    it('rejects registration without a token', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({ email: `noauth.${Date.now()}@mitra.local`, password: 'Password123!', firstName: 'No', lastName: 'Auth' });
      expect(res.status).toBe(401);
    });

    it('rejects registration from a non-admin user', async () => {
      const email = `nonadmin.${Date.now()}@mitra.local`;
      const password = 'NonAdminPass123!';

      const created = await request(server)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ email, password, firstName: 'Non', lastName: 'Admin' });
      expect(created.status).toBe(201);

      const login = await request(server)
        .post('/api/auth/login')
        .send({ email, password });
      expect(login.status).toBe(200);
      // This user has no role assigned by /register, so RolesGuard must deny.
      expect(login.body.user.role).toBeNull();

      const attempt = await request(server)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${login.body.access_token}`)
        .send({ email: `another.${Date.now()}@mitra.local`, password: 'Whatever123!', firstName: 'A', lastName: 'B' });
      expect(attempt.status).toBe(403);
    });

    it('creates a new user that can immediately log in', async () => {
      const email = `created.${Date.now()}@mitra.local`;
      const password = 'BrandNewUser123!';

      const created = await request(server)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ email, password, firstName: 'Brand', lastName: 'New' });
      expect(created.status).toBe(201);
      expect(created.body.email).toBe(email);
      expect(created.body.passwordHash).toBeUndefined();

      const login = await request(server)
        .post('/api/auth/login')
        .send({ email, password });
      expect(login.status).toBe(200);
    });

    it('rejects duplicate email registration', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ email: ADMIN_EMAIL, password: 'Whatever123!', firstName: 'Dup', lastName: 'Licate' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('changes the password and invalidates existing refresh tokens', async () => {
      const email = `changepass.${Date.now()}@mitra.local`;
      const oldPassword = 'OldPassword123!';
      const newPassword = 'NewPassword456!';

      await request(server)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ email, password: oldPassword, firstName: 'Change', lastName: 'Pass' });

      const login = await request(server)
        .post('/api/auth/login')
        .send({ email, password: oldPassword });
      expect(login.status).toBe(200);
      const { access_token, refresh_token } = login.body;

      const changed = await request(server)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${access_token}`)
        .send({ oldPassword, newPassword });
      expect(changed.status).toBe(200);

      // Old password no longer works
      const oldLogin = await request(server)
        .post('/api/auth/login')
        .send({ email, password: oldPassword });
      expect(oldLogin.status).toBe(401);

      // New password works
      const newLogin = await request(server)
        .post('/api/auth/login')
        .send({ email, password: newPassword });
      expect(newLogin.status).toBe(200);

      // The refresh token issued before the password change is now invalid
      const refreshAfterChange = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken: refresh_token });
      expect(refreshAfterChange.status).toBe(401);
    });

    it('rejects change-password with an incorrect old password', async () => {
      const res = await request(server)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ oldPassword: 'definitely-wrong', newPassword: 'NewPassword789!' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('invalidates the refresh token so it can no longer be used', async () => {
      const email = `logout.${Date.now()}@mitra.local`;
      const password = 'LogoutPass123!';

      await request(server)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ email, password, firstName: 'Log', lastName: 'Out' });

      const login = await request(server)
        .post('/api/auth/login')
        .send({ email, password });
      expect(login.status).toBe(200);
      const { access_token, refresh_token } = login.body;

      const logout = await request(server)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${access_token}`);
      expect(logout.status).toBe(204);

      const refreshAfterLogout = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken: refresh_token });
      expect(refreshAfterLogout.status).toBe(401);
    });
  });
});
