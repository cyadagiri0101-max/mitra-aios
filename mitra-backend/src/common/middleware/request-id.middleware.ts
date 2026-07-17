import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Assigns a unique request-id to every incoming HTTP request.
 *
 * Priority: X-Request-ID from client → newly generated UUID v4.
 * The ID is echoed back in the response header so clients can correlate
 * logs across frontend / backend / ingress.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const id = (req.headers['x-request-id'] as string) || randomUUID();
    req.headers['x-request-id'] = id;
    res.setHeader('X-Request-ID', id);
    next();
  }
}
