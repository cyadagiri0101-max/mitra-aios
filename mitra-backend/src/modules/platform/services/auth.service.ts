import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';

interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    private readonly jwtService: JwtService,
  ) {}

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** SHA-256 hex of a token — stored in the DB instead of the raw token */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildPermissions(user: User): string[] {
    return (user.role?.permissions ?? [])
      .filter((rp: any) => rp.permission)
      .map((rp: any) => `${rp.permission.resource as string}:${rp.permission.action as string}`);
  }

  private issueTokenPair(user: User) {
    const permissions = this.buildPermissions(user);
    const accessPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role?.name ?? null,
      permissions,
    };

    // Use a random 48-byte opaque token as the refresh token value.
    // Only its SHA-256 hash is persisted; the raw token is returned once and
    // then discarded — following the "bearer token in DB hash" pattern.
    const rawRefreshToken = randomBytes(48).toString('hex');

    return {
      access_token: this.jwtService.sign(accessPayload, { expiresIn: '15m' }),
      refresh_token: rawRefreshToken,
      rawRefreshHash: this.hashToken(rawRefreshToken),
    };
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email, deletedAt: IsNull() },
      relations: ['role', 'role.permissions', 'role.permissions.permission'],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is locked. Try again later.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      await this.userRepository.save(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const { access_token, refresh_token, rawRefreshHash } = this.issueTokenPair(user);

    // Persist the hash — invalidates any previously-issued refresh token
    user.refreshTokenHash = rawRefreshHash;
    await this.userRepository.save(user);

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role?.name ?? null,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email, deletedAt: IsNull() },
    });
    if (existing) throw new BadRequestException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      tenantId: dto.tenantId ?? null,
      status: 'active',
      failedLoginAttempts: 0,
    });
    return this.userRepository.save(user);
  }

  /**
   * Validates the incoming raw refresh token, rotates it, and returns a new
   * access token + new refresh token.  The old refresh token is invalidated
   * immediately — reuse detection is therefore implicit.
   */
  async refreshToken(rawRefreshToken: string) {
    if (!rawRefreshToken || rawRefreshToken.length < 96) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const incomingHash = this.hashToken(rawRefreshToken);

    // Find the user whose stored hash matches
    const user = await this.userRepository.findOne({
      where: { refreshTokenHash: incomingHash, deletedAt: IsNull() },
      relations: ['role', 'role.permissions', 'role.permissions.permission'],
    });

    if (!user) {
      // Either the token was already rotated (replay) or forged
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Issue a new pair and persist the new hash — old token is now dead
    const { access_token, refresh_token, rawRefreshHash } = this.issueTokenPair(user);
    user.refreshTokenHash = rawRefreshHash;
    await this.userRepository.save(user);

    return { access_token, refresh_token };
  }

  /** Logout: wipe the stored refresh token hash so no further refreshes are possible */
  async logout(userId: string): Promise<void> {
    await this.userRepository.update({ id: userId }, { refreshTokenHash: null });
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, deletedAt: IsNull() },
    });
    if (!user) throw new UnauthorizedException('User not found');
    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) throw new BadRequestException('Old password is incorrect');

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    // Invalidate all existing refresh tokens on password change
    user.refreshTokenHash = null;
    await this.userRepository.save(user);
    return { message: 'Password changed successfully' };
  }
}
