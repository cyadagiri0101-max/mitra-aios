import { AsyncLocalStorage } from 'async_hooks';

/**
 * Per-request context stored in AsyncLocalStorage so TypeORM entity subscribers
 * can read userId/tenantId without needing DI or HTTP injection.
 *
 * Set by RequestContextInterceptor, which runs AFTER JwtAuthGuard so req.user
 * is already populated when the store is created.
 * Returns null values when called outside an HTTP request (seed scripts, etc.).
 */
export interface RequestContext {
  userId:   string | null;
  tenantId: string | null;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext {
  return requestContextStorage.getStore() ?? { userId: null, tenantId: null };
}
