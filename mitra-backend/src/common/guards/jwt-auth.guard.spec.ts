import { JwtAuthGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

const makeCtx = (isPublic = false): ExecutionContext => ({
  getHandler:   () => ({}),
  getClass:     () => ({}),
  switchToHttp: () => ({ getRequest: () => ({ user: null }) }),
} as unknown as ExecutionContext);

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  it('allows access for @Public() routes without a token', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const result = guard.canActivate(makeCtx());
    expect(result).toBe(true);
  });

  it('throws UnauthorizedException when user is null', () => {
    expect(() => guard.handleRequest(null, null, null)).toThrow(UnauthorizedException);
  });

  it('throws original error when err is provided', () => {
    const err = new UnauthorizedException('token expired');
    expect(() => guard.handleRequest(err, null, null)).toThrow(err);
  });

  it('returns user when valid user object is provided', () => {
    const user = { id: 'u-1', email: 'a@b.com' };
    expect(guard.handleRequest(null, user, null)).toBe(user);
  });
});
