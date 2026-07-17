import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * PermissionsGuard — enforces fine-grained permission checks
 * beyond coarse role-based access.
 *
 * Usage:
 *   @Permissions('project:approve', 'design:release')
 *   @UseGuards(JwtAuthGuard, PermissionsGuard)
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Authentication required');

    const userPermissions: string[] = user?.permissions ?? [];
    const hasPermission = requiredPermissions.every((p) => userPermissions.includes(p));

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied. Required permissions: ${requiredPermissions.join(', ')}`
      );
    }
    return true;
  }
}
