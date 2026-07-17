import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** JWT-authenticated user, injected by JwtStrategy.validate() */
export interface AuthUser {
  id: string;
  email: string;
  tenantId: string | null;
  role: string;
  permissions: string[];
}

/**
 * Parameter decorator that extracts the authenticated user from the JWT payload.
 *
 * Usage: async myAction(@CurrentUser() user: AuthUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user as AuthUser;
  },
);
