import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

// ── Mock user shape ──────────────────────────────────────────────────────────
// Explicit interface eliminates TS2322 errors when overriding Date|string fields.
interface MockUser {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  status: string;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  tenantId: string | null;
  refreshTokenHash: string | null;
  role: { name: string; permissions: unknown[] };
}

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

let hashedPassword: string;
beforeAll(async () => {
  hashedPassword = await bcrypt.hash('Admin@123', 12);
});

const makeMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: 'user-uuid-1234',
  email: 'admin@mitra.local',
  passwordHash: hashedPassword,
  firstName: 'System',
  lastName: 'Administrator',
  status: 'active',
  failedLoginAttempts: 0,
  lockedUntil: null,
  lastLoginAt: null,
  tenantId: null,
  refreshTokenHash: null,
  role: { name: 'ADMIN', permissions: [] },
  ...overrides,
});

// ── Test suite ───────────────────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;
  let saveMock: jest.Mock;
  let findOneMock: jest.Mock;

  beforeEach(async () => {
    saveMock = jest.fn();
    findOneMock = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'signed-jwt-token'),
            verify: jest.fn(() => ({ sub: 'user-uuid-1234' })),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: findOneMock,
            save: saveMock,
            create: jest.fn((d: unknown) => d),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── login ──────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('returns access_token, refresh_token, and user on valid credentials', async () => {
      findOneMock.mockResolvedValueOnce(makeMockUser());
      saveMock.mockResolvedValue(makeMockUser());
      const result = await service.login('admin@mitra.local', 'Admin@123');
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(result.user.email).toBe('admin@mitra.local');
    });

    it('persists the refresh_token_hash on login', async () => {
      const user = makeMockUser();
      findOneMock.mockResolvedValueOnce(user);
      saveMock.mockResolvedValue(user);
      await service.login('admin@mitra.local', 'Admin@123');
      const savedUser = saveMock.mock.calls[saveMock.mock.calls.length - 1][0];
      expect(savedUser.refreshTokenHash).toBeTruthy();
      expect(typeof savedUser.refreshTokenHash).toBe('string');
      expect(savedUser.refreshTokenHash.length).toBe(64); // SHA-256 hex
    });

    it('throws UnauthorizedException for unknown email', async () => {
      findOneMock.mockResolvedValueOnce(null);
      await expect(service.login('nobody@example.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      findOneMock.mockResolvedValueOnce(makeMockUser());
      saveMock.mockResolvedValue(makeMockUser());
      await expect(service.login('admin@mitra.local', 'WrongPass!')).rejects.toThrow(UnauthorizedException);
    });

    it('increments failedLoginAttempts on wrong password', async () => {
      const user = makeMockUser({ failedLoginAttempts: 0 });
      findOneMock.mockResolvedValueOnce(user);
      saveMock.mockResolvedValue(user);
      await expect(service.login('admin@mitra.local', 'WrongPass!')).rejects.toThrow();
      const saved = saveMock.mock.calls[0][0];
      expect(saved.failedLoginAttempts).toBe(1);
    });

    it('locks account after 5 failed attempts', async () => {
      const user = makeMockUser({ failedLoginAttempts: 4 });
      findOneMock.mockResolvedValueOnce(user);
      saveMock.mockResolvedValue(user);
      await expect(service.login('admin@mitra.local', 'WrongPass!')).rejects.toThrow();
      const saved = saveMock.mock.calls[0][0];
      expect(saved.lockedUntil).toBeInstanceOf(Date);
      expect(saved.lockedUntil.getTime()).toBeGreaterThan(Date.now());
    });

    it('rejects login for a locked account', async () => {
      const user = makeMockUser({ lockedUntil: new Date(Date.now() + 99_999) });
      findOneMock.mockResolvedValueOnce(user);
      await expect(service.login('admin@mitra.local', 'Admin@123')).rejects.toThrow('Account is locked');
    });

    it('resets failedLoginAttempts and lockedUntil on successful login', async () => {
      const user = makeMockUser({ failedLoginAttempts: 2 });
      findOneMock.mockResolvedValueOnce(user);
      saveMock.mockResolvedValue(user);
      await service.login('admin@mitra.local', 'Admin@123');
      const saved = saveMock.mock.calls[0][0];
      expect(saved.failedLoginAttempts).toBe(0);
      expect(saved.lockedUntil).toBeNull();
    });
  });

  // ── refreshToken ───────────────────────────────────────────────────────────
  describe('refreshToken', () => {
    it('returns new access_token and new refresh_token', async () => {
      const rawToken = 'a'.repeat(96);
      const hash = hashToken(rawToken);
      const user = makeMockUser({ refreshTokenHash: hash });
      findOneMock.mockResolvedValueOnce(user);
      saveMock.mockResolvedValue(user);
      const result = await service.refreshToken(rawToken);
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
    });

    it('rotates: stores a NEW hash after refresh (old token dead)', async () => {
      const rawToken = 'b'.repeat(96);
      const hash = hashToken(rawToken);
      const user = makeMockUser({ refreshTokenHash: hash });
      findOneMock.mockResolvedValueOnce(user);
      saveMock.mockResolvedValue(user);
      await service.refreshToken(rawToken);
      const savedUser = saveMock.mock.calls[saveMock.mock.calls.length - 1][0];
      expect(savedUser.refreshTokenHash).not.toBe(hash); // new hash stored
    });

    it('rejects a too-short token (guard rail)', async () => {
      await expect(service.refreshToken('short')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an unknown / replayed token (no matching user)', async () => {
      findOneMock.mockResolvedValueOnce(null);
      await expect(service.refreshToken('c'.repeat(96))).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logout ─────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('clears refreshTokenHash via repository.update', async () => {
      const updateMock = jest.fn();
      (service as any).userRepository.update = updateMock;
      await service.logout('user-uuid-1234');
      expect(updateMock).toHaveBeenCalledWith(
        { id: 'user-uuid-1234' },
        { refreshTokenHash: null },
      );
    });
  });

  // ── register ───────────────────────────────────────────────────────────────
  describe('register', () => {
    it('creates and returns a new user', async () => {
      findOneMock.mockResolvedValueOnce(null); // no duplicate
      saveMock.mockResolvedValue({ id: 'new-uuid', email: 'new@mitra.local' });
      const result = await service.register({
        email: 'new@mitra.local',
        password: 'Str0ngPass!',
        firstName: 'Jane',
        lastName: 'Doe',
      });
      expect(result.id).toBeDefined();
    });

    it('throws BadRequestException for duplicate email', async () => {
      findOneMock.mockResolvedValueOnce(makeMockUser());
      await expect(
        service.register({ email: 'admin@mitra.local', password: 'pass', firstName: 'A', lastName: 'B' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── changePassword ─────────────────────────────────────────────────────────
  describe('changePassword', () => {
    it('changes password and clears refreshTokenHash', async () => {
      const user = makeMockUser({ refreshTokenHash: 'oldhash' });
      findOneMock.mockResolvedValueOnce(user);
      saveMock.mockResolvedValue(user);
      const result = await service.changePassword('user-uuid-1234', 'Admin@123', 'NewSecure!99');
      expect(result.message).toContain('Password changed');
      const saved = saveMock.mock.calls[0][0];
      expect(saved.refreshTokenHash).toBeNull(); // sessions invalidated
    });

    it('rejects if old password is wrong', async () => {
      findOneMock.mockResolvedValueOnce(makeMockUser());
      await expect(
        service.changePassword('user-uuid-1234', 'WrongOldPassword', 'NewPass!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws for unknown user id', async () => {
      findOneMock.mockResolvedValueOnce(null);
      await expect(
        service.changePassword('ghost-id', 'any', 'any'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
