import { SetMetadata } from '@nestjs/common';

/**
 * Business-event audit decorator.
 * When applied to a controller method, the AuditInterceptor will
 * capture the event name and persist an audit log with
 * eventType = BUSINESS.
 *
 * Example:
 *   @AuditEvent('design:released')
 *   @Patch(':id/release')
 *   releaseDesign(...) { ... }
 */
export const AUDIT_EVENT_KEY = 'auditEvent';
export const AuditEvent = (eventName: string) => SetMetadata(AUDIT_EVENT_KEY, eventName);
