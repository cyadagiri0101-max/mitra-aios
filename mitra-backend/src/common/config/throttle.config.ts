/**
 * Centralised, environment-overridable throttle limits.
 *
 * Hardcoding rate limits directly in `@Throttle()` decorators meant
 * operators could not tune brute-force protection without a code change
 * and redeploy, and made these endpoints hard to exercise in automated
 * test suites (a handful of e2e tests for login/refresh easily exceed
 * "10 requests per 15 minutes").
 *
 * Defaults below are UNCHANGED from the original hardcoded values, so
 * production behaviour is identical unless the corresponding env var is
 * explicitly set.
 */

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const AUTH_LOGIN_THROTTLE = {
  ttl: intFromEnv('AUTH_LOGIN_THROTTLE_TTL_MS', 900_000),
  limit: intFromEnv('AUTH_LOGIN_THROTTLE_LIMIT', 10),
};

export const AI_CHAT_THROTTLE = {
  ttl: intFromEnv('AI_CHAT_THROTTLE_TTL_MS', 60_000),
  limit: intFromEnv('AI_CHAT_THROTTLE_LIMIT', 30),
};

export const AI_ANALYZE_THROTTLE = {
  ttl: intFromEnv('AI_ANALYZE_THROTTLE_TTL_MS', 60_000),
  limit: intFromEnv('AI_ANALYZE_THROTTLE_LIMIT', 20),
};

export const ENGINEERING_REASONING_THROTTLE = {
  ttl: intFromEnv('ENGINEERING_REASONING_THROTTLE_TTL_MS', 60_000),
  limit: intFromEnv('ENGINEERING_REASONING_THROTTLE_LIMIT', 30),
};

export const ENGINEERING_EVALUATION_THROTTLE = {
  ttl: intFromEnv('ENGINEERING_EVALUATION_THROTTLE_TTL_MS', 60_000),
  limit: intFromEnv('ENGINEERING_EVALUATION_THROTTLE_LIMIT', 20),
};

export const ENGINEERING_REVIEW_THROTTLE = {
  ttl: intFromEnv('ENGINEERING_REVIEW_THROTTLE_TTL_MS', 60_000),
  limit: intFromEnv('ENGINEERING_REVIEW_THROTTLE_LIMIT', 60),
};

export const ENGINEERING_WORKSPACE_THROTTLE = {
  ttl: intFromEnv('ENGINEERING_WORKSPACE_THROTTLE_TTL_MS', 60_000),
  limit: intFromEnv('ENGINEERING_WORKSPACE_THROTTLE_LIMIT', 120),
};

