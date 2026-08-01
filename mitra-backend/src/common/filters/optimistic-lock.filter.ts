import {
  ArgumentsHost, Catch, ExceptionFilter, ConflictException,
} from '@nestjs/common';
import { OptimisticLockVersionMismatchError } from 'typeorm';

/**
 * Maps TypeORM's OptimisticLockVersionMismatchError to HTTP 409 Conflict.
 *
 * Sprint 2.1.1: entities now use @VersionColumn for optimistic locking.
 * A concurrent update that would overwrite a newer revision must surface
 * as a conflict the client can retry with fresh data — not a 500.
 */
@Catch(OptimisticLockVersionMismatchError)
export class OptimisticLockFilter implements ExceptionFilter {
  catch(exception: OptimisticLockVersionMismatchError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const conflict = new ConflictException(
      'The record was modified by another request. Refresh and retry.',
    );
    const status = conflict.getStatus();
    const body = conflict.getResponse();

    response.status(status).json(
      typeof body === 'string' ? { statusCode: status, message: body } : body,
    );
  }
}
