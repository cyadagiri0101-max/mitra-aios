import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';

const makeAuthService = () => ({
  login:          jest.fn().mockResolvedValue({ access_token: 'at', refresh_token: 'rt', user: { id: 'u-1' } }),
  refreshToken:   jest.fn().mockResolvedValue({ access_token: 'new-at', refresh_token: 'new-rt' }),
  register:       jest.fn().mockResolvedValue({ id: 'u-new' }),
  changePassword: jest.fn().mockResolvedValue({ message: 'Password changed successfully' }),
  logout:         jest.fn().mockResolvedValue(undefined),
});

describe('AuthController', () => {
  let controller: AuthController;
  let svc: ReturnType<typeof makeAuthService>;

  beforeEach(async () => {
    svc = makeAuthService();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers:   [{ provide: AuthService, useValue: svc }],
    })
      .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('login() delegates to authService.login', async () => {
    const result = await controller.login({ email: 'a@b.com', password: 'pass' } as any);
    expect(svc.login).toHaveBeenCalledWith('a@b.com', 'pass');
    expect(result.access_token).toBe('at');
    expect(result.refresh_token).toBe('rt');
  });

  it('refresh() delegates to authService.refreshToken', async () => {
    const result = await controller.refresh({ refreshToken: 'rt' } as any);
    expect(svc.refreshToken).toHaveBeenCalledWith('rt');
    expect(result.access_token).toBe('new-at');
    expect(result.refresh_token).toBe('new-rt');
  });

  it('me() returns the current user from @CurrentUser decorator', async () => {
    // @CurrentUser() injects the user directly from the JWT payload
    const user = { id: 'u-1', email: 'admin@mitra.local', tenantId: 't-1', role: 'ADMIN', permissions: [] };
    const result = await controller.me(user as any);
    expect(result).toBe(user);
  });

  it('changePassword() delegates to authService.changePassword', async () => {
    const user = { id: 'u-1', email: 'admin@mitra.local', tenantId: 't-1', role: 'ADMIN', permissions: [] };
    const result = await controller.changePassword(
      user as any,
      { oldPassword: 'old', newPassword: 'new!Secure9' } as any,
    );
    expect(svc.changePassword).toHaveBeenCalledWith('u-1', 'old', 'new!Secure9');
    expect(result.message).toContain('changed');
  });

  it('logout() calls authService.logout with user id', async () => {
    const user = { id: 'u-logout', email: 'x@x.com', tenantId: null, role: 'ADMIN', permissions: [] };
    await controller.logout(user as any);
    expect(svc.logout).toHaveBeenCalledWith('u-logout');
  });

  it('register() delegates to authService.register (admin only)', async () => {
    const dto = { email: 'new@mitra.local', password: 'P@ssw0rd!', firstName: 'New', lastName: 'User' };
    const mockCreator = { id: 'admin-id', tenantId: 'tenant-1' } as any;
    const result = await controller.register(dto as any, mockCreator);
    expect(svc.register).toHaveBeenCalledWith({ ...dto, tenantId: 'tenant-1' });
    expect(result.id).toBe('u-new');
  });
});
