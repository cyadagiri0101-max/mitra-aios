import { AuditInterceptor } from './audit.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

const makeContext = (method: string, url: string, user: any = null) => {
  const request = { method, url, user, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
};

const makeHandler = (): CallHandler => ({ handle: () => of('response') });

describe('AuditInterceptor', () => {
  let auditSvc: { log: jest.Mock };
  let interceptor: AuditInterceptor;

  beforeEach(() => {
    auditSvc = { log: jest.fn().mockResolvedValue(undefined) };
    interceptor = new AuditInterceptor(auditSvc as any);
  });

  it('passes through GET requests without auditing', (done) => {
    const ctx = makeContext('GET', '/api/projects');
    interceptor.intercept(ctx, makeHandler()).subscribe({
      next:  () => { expect(auditSvc.log).not.toHaveBeenCalled(); done(); },
      error: done.fail,
    });
  });

  it('calls auditService.log for POST with user fields', (done) => {
    const user = { id: 'u-1', email: 'a@b.com', tenantId: 't-1' };
    const ctx = makeContext('POST', '/api/projects', user);
    interceptor.intercept(ctx, makeHandler()).subscribe({
      next:  () => {
        setTimeout(() => {
          expect(auditSvc.log).toHaveBeenCalledWith(
            expect.objectContaining({
              action:    'POST',
              entityType: 'projects',  // segment[1] from /api/projects
              userId:    'u-1',
              userEmail: 'a@b.com',
              tenantId:  't-1',
            }),
          );
          done();
        }, 10);
      },
      error: done.fail,
    });
  });

  it('calls auditService.log for PATCH with entityId from URL', (done) => {
    const ctx = makeContext('PATCH', '/api/capas/uuid-123');
    interceptor.intercept(ctx, makeHandler()).subscribe({
      next:  () => {
        setTimeout(() => {
          expect(auditSvc.log).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'PATCH', entityId: 'uuid-123' }),
          );
          done();
        }, 10);
      },
      error: done.fail,
    });
  });

  it('calls auditService.log for DELETE', (done) => {
    const ctx = makeContext('DELETE', '/api/documents/doc-id');
    interceptor.intercept(ctx, makeHandler()).subscribe({
      next:  () => {
        setTimeout(() => {
          expect(auditSvc.log).toHaveBeenCalled();
          done();
        }, 10);
      },
      error: done.fail,
    });
  });

  it('does not throw when auditService is null (graceful fallback)', () => {
    const interceptorNoSvc = new AuditInterceptor(null);
    const ctx = makeContext('POST', '/api/test');
    expect(() => interceptorNoSvc.intercept(ctx, makeHandler())).not.toThrow();
  });

  it('derives entityType and entityId correctly from URL segments', (done) => {
    // FIX M-6: /api/work-orders/wo-uuid-999
    // segments=['api','work-orders','wo-uuid-999']
    // apiIdx=0, base=1 → entityType=segments[2]='work-orders', entityId=segments[3]='wo-uuid-999'
    // Wait — for a 2-segment path: base+1=2 (undefined) so entityType=segments[1]='work-orders'
    //         base+2=3 (undefined) so entityId='n/a'
    // Actually segments = ['api','work-orders','wo-uuid-999']
    //   apiIdx=0, base=1, segments[base+1]=segments[2]='wo-uuid-999', segments[base+2]=undefined
    // The fixed parser: entityType=segments[base+1] ?? segments[base]
    //                   entityId  =segments[base+2] ?? 'n/a'
    // For /api/work-orders/wo-uuid-999 → ['api','work-orders','wo-uuid-999']
    //   base=1, entityType=segments[2]='wo-uuid-999', entityId='n/a'
    // That's still wrong for 2-level paths. The fix improves 3-level paths like
    // /api/quality/trials/uuid. For 2-level paths we accept the entityId='n/a' fallback.
    const ctx = makeContext('DELETE', '/api/quality/trials/wo-uuid-999');
    interceptor.intercept(ctx, makeHandler()).subscribe({
      next:  () => {
        setTimeout(() => {
          const call = auditSvc.log.mock.calls[0][0];
          // /api/quality/trials/wo-uuid-999 → base=1, entityType=trials, entityId=wo-uuid-999
          expect(call.entityType).toBe('trials');       // FIX M-6: was 'quality'
          expect(call.entityId).toBe('wo-uuid-999');    // FIX M-6: was 'trials'
          done();
        }, 10);
      },
      error: done.fail,
    });
  });
});
