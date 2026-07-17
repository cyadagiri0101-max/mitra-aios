import {
  CallHandler, ExecutionContext, Injectable, NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { requestContextStorage } from '../context/request-context';

/**
 * Binds the authenticated user into AsyncLocalStorage so TypeORM subscribers
 * (IndustrialSubscriber) can auto-stamp createdBy / updatedBy on every entity write.
 *
 * Runs AFTER guards (including JwtAuthGuard), so req.user is already populated.
 * Registered globally in AppModule as APP_INTERCEPTOR — must be first so it wraps
 * AuditInterceptor and all controller logic.
 */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req  = ctx.switchToHttp().getRequest();
    const user = req.user as { id?: string; tenantId?: string } | undefined;

    return new Observable((observer) => {
      requestContextStorage.run(
        { userId: user?.id ?? null, tenantId: user?.tenantId ?? null },
        () => {
          next.handle().subscribe({
            next:     (v) => observer.next(v),
            error:    (e) => observer.error(e),
            complete: () => observer.complete(),
          });
        },
      );
    });
  }
}
