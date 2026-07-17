import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Records the X-Tenant-ID request header for potential future use (e.g.
 * tenant-resolution before authentication in a public-API tier).
 *
 * IMPORTANT — SECURITY NOTE:
 * This value is intentionally NOT used to determine which tenant data
 * a user can access.  All tenant-scoping decisions in service and controller
 * code use `user.tenantId` from the JWT payload (populated by JwtStrategy),
 * which is set at login time and is signed / tamper-proof.
 *
 * Using a client-supplied header for tenant isolation would be an IDOR
 * vulnerability — any client could claim any tenant by setting the header.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    // Store for observability/logging only.  Never use for access control.
    (req as any)._requestedTenantId = req.headers['x-tenant-id'] ?? null;
    next();
  }
}
