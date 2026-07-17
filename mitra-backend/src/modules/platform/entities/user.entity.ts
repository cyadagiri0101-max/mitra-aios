import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { Role } from './role.entity';

@Entity('users')
@Index(['email', 'deletedAt'])
export class User extends IndustrialBaseEntity {
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  @Exclude()           // ← never returned in API responses
  passwordHash: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  @Exclude()
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  @Exclude()
  lockedUntil: Date | null;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'mfa_enabled', type: 'boolean', default: false })
  mfaEnabled: boolean;

  @Column({ name: 'mfa_secret', type: 'varchar', length: 255, nullable: true })
  @Exclude()
  mfaSecret: string | null;

  /**
   * SHA-256 hash of the currently-valid refresh token.
   * Null when the user has no active session.
   * Rotated on every /auth/refresh call; cleared on logout.
   */
  @Column({ name: 'refresh_token_hash', type: 'varchar', length: 64, nullable: true })
  @Exclude()
  refreshTokenHash: string | null;

  @Column({ name: 'role_id', type: 'uuid', nullable: true })
  @Index()
  roleId: string | null;

  @ManyToOne(() => Role, (role) => role.users, { nullable: true })
  @JoinColumn({ name: 'role_id' })
  role: Role | null;
}