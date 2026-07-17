import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Optional,
} from '@nestjs/common';
import { Observable, tap, finalize, catchError } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { AuditService } from '../../modules/audit/services/audit.service';
import { AuditEventType } from '../../modules/audit/entities/audit-log.entity';
import { AUDIT_EVENT_KEY } from '../decorators/audit-event.decorator';

/**
 * Automatically persists a structured audit record for every mutating HTTP
 * request (POST / PATCH / PUT / DELETE) via the real AuditService.
 *
 * Injecting AuditService is optional so the interceptor still works in
 * module contexts where the audit module is not imported (e.g. some unit
 * tests).  If unavailable it falls back to a structured log line via
 * console.debug so there is always *some* record.
 *
 * If the handler is decorated with @AuditEvent('eventName'), the interceptor
 * logs a BUSINESS event with that name instead of the default CRUD action.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @Optional() private readonly auditService: AuditService | null,
    @Optional() private readonly reflector: Reflector | null,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, headers } = request;
    const mutatingMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];

    if (!mutatingMethods.includes(method)) {
      return next.handle();
    }

    const auditEvent = this.reflector
      ? this.reflector.getAllAndOverride<string>(AUDIT_EVENT_KEY, [
          context.getHandler(),
          context.getClass(),
        ])
      : undefined;

    let responseData: any = null;
    let errorData: any = null;

    return next.handle().pipe(
      tap((response) => { responseData = response; }),
      catchError((err) => {
        errorData = err;
        throw err;
      }),
      finalize(() => {
        const segments = url.split('/').filter(Boolean);
        const apiIdx = segments.indexOf('api');
        const base   = apiIdx >= 0 ? apiIdx + 1 : 0;
        const rest   = segments.slice(base);
        let entityType: string;
        let entityId: string;
        if (rest.length >= 2) {
          entityId   = rest[rest.length - 1];
          entityType = rest[rest.length - 2];
        } else {
          entityType = rest[0] ?? 'unknown';
          entityId   = 'n/a';
        }

        const auditInput = {
          entityType,
          entityId,
          action: auditEvent ?? method,
          eventType: auditEvent ? AuditEventType.BUSINESS : AuditEventType.CRUD,
          userId:    user?.id ?? null,
          userEmail: user?.email ?? null,
          tenantId:  user?.tenantId ?? null,
          ipAddress: ip ?? headers['x-forwarded-for'] ?? null,
          userAgent: headers['user-agent'] ?? null,
          metadata:  { url, success: !errorData, error: errorData?.message },
        };

        if (this.auditService) {
          this.auditService.log(auditInput).catch((err: Error) => {
            console.error(`[AUDIT] Persist failed: ${err.message}`);
          });
        } else {
          console.debug('[AUDIT]', JSON.stringify(auditInput));
        }
      }),
    );
  }
}
