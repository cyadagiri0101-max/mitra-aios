import * as dotenv from 'dotenv';
import { join } from 'path';

// Runs once per test file via Jest `setupFiles`, BEFORE any test code
// (and therefore before AppModule's ConfigModule.forRoot() loads .env).
// dotenv's default behaviour does NOT overwrite already-set process.env
// keys, so everything assigned here takes precedence over .env values —
// pointing the whole app at an isolated test database/config.

dotenv.config({ path: join(__dirname, '..', '.env') });

process.env.NODE_ENV = 'test';

process.env.DB_HOST = process.env.DB_HOST ?? 'localhost';
process.env.DB_PORT = process.env.DB_PORT ?? '5432';
process.env.DB_USERNAME = process.env.DB_USERNAME ?? process.env.DB_USER ?? 'mitra_admin';
process.env.DB_USER = process.env.DB_USER ?? process.env.DB_USERNAME;
process.env.DB_NAME = process.env.E2E_DB_NAME ?? 'mitra_v2_test';
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? process.env.DB_PASS ?? process.env.PGPASSWORD;
process.env.PGPASSWORD = process.env.PGPASSWORD ?? process.env.DB_PASSWORD;
process.env.DB_SYNC = 'false';
process.env.DB_LOGGING = 'false';
process.env.DB_SSL = 'false';

process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'e2e-test-jwt-secret-do-not-use-in-prod-0123456789abcdef';
process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION ?? '15m';

process.env.MINIO_ENDPOINT = process.env.MINIO_ENDPOINT ?? 'localhost';
process.env.MINIO_PORT = process.env.MINIO_PORT ?? '9000';
process.env.MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY ?? 'minioadmin';
process.env.MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY ?? 'minioadmin';
process.env.MINIO_USE_SSL = 'false';
process.env.MINIO_BUCKET = process.env.MINIO_BUCKET ?? 'mitra-documents-test';

process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';

process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000';
process.env.AI_ENABLED = process.env.AI_ENABLED ?? 'false';

process.env.SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdminPass!2026';

// Production defaults (10 logins / 15 min per IP) are far too tight for an
// e2e suite making many requests from a single client. Override here rather
// than in .env so production tuning is unaffected.
process.env.AUTH_LOGIN_THROTTLE_LIMIT = process.env.AUTH_LOGIN_THROTTLE_LIMIT ?? '1000';
process.env.AUTH_LOGIN_THROTTLE_TTL_MS = process.env.AUTH_LOGIN_THROTTLE_TTL_MS ?? '900000';
process.env.AI_CHAT_THROTTLE_LIMIT = process.env.AI_CHAT_THROTTLE_LIMIT ?? '1000';
process.env.AI_ANALYZE_THROTTLE_LIMIT = process.env.AI_ANALYZE_THROTTLE_LIMIT ?? '1000';
