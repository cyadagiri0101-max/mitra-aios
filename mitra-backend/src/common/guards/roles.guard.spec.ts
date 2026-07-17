import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

const makeCtx = (user: any): ExecutionContext => ({
  getHandler:     () => ({}),
  getClass:       () => ({}),
  switchToHttp:   () => ({ getRequest: () => ({ user }) }),
} as unknown as ExecutionContext);

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const setRoles = (roles: string[] | undefined) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);
  };

  it('allows access when no roles are required (public handler)', () => {
    setRoles(undefined);
    expect(guard.canActivate(makeCtx(null))).toBe(true);
  });

  it('denies access when user is missing and roles are required', () => {
    setRoles(['ADMIN']);
    expect(guard.canActivate(makeCtx(null))).toBe(false);
  });

  it('allows ADMIN user to access ADMIN-only route', () => {
    setRoles(['ADMIN']);
    expect(guard.canActivate(makeCtx({ role: 'ADMIN' }))).toBe(true);
  });

  it('denies VIEWER user from ADMIN-only route', () => {
    setRoles(['ADMIN']);
    expect(guard.canActivate(makeCtx({ role: 'VIEWER' }))).toBe(false);
  });

  it('allows when user.role matches any in required list', () => {
    setRoles(['ADMIN', 'MANAGER']);
    expect(guard.canActivate(makeCtx({ role: 'MANAGER' }))).toBe(true);
  });

  it('supports roles as string array on user.roles', () => {
    setRoles(['QUALITY']);
    expect(guard.canActivate(makeCtx({ roles: ['QUALITY', 'VIEWER'] }))).toBe(true);
  });

  it('denies when user.roles does not contain required role', () => {
    setRoles(['ADMIN']);
    expect(guard.canActivate(makeCtx({ roles: ['VIEWER'] }))).toBe(false);
  });
});
