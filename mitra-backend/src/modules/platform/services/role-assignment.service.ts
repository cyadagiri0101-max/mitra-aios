import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { AuditService } from '@modules/audit/services/audit.service';
import { AuthUser } from '@common/decorators/current-user.decorator';

/**
 * RoleAssignmentService — the ONLY code path that may change a user's role.
 *
 * SECURITY (C-1 remediation):
 *  - Role changes are forbidden on the generic user-update path.
 *  - Assignment requires the actor to be a System Administrator AND hold the
 *    `user:assign_role` permission (defense in depth).
 *  - Cross-tenant assignment is rejected at the repository layer.
 *  - Every assignment is written to the audit log.
 */
@Injectable()
export class RoleAssignmentService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Assign a role to a user. Returns the updated user (with role relation).
   *
   * @param targetUserId  user whose role is being changed
   * @param roleId        target role (must belong to the same tenant)
   * @param actor         authenticated actor (ADMIN + `user:assign_role` required)
   * @param reason        optional human-readable justification (audited)
   */
  async assignRole(
    targetUserId: string,
    roleId: string,
    actor: AuthUser,
    reason?: string,
  ): Promise<User> {
    // ── Actor authorization (service layer — never trust the guard alone) ──
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only a System Administrator can assign roles');
    }
    if (!actor.permissions?.includes('user:assign_role')) {
      throw new ForbiddenException('Requires permission: user:assign_role');
    }

    // ── Repository layer: tenant-scoped lookups ────────────────────────────
    const targetWhere: any = { id: targetUserId, deletedAt: IsNull() };
    const roleWhere: any = { id: roleId, deletedAt: IsNull() };
    if (actor.tenantId) {
      targetWhere.tenantId = actor.tenantId;
      roleWhere.tenantId = actor.tenantId;
    }
    const target = await this.userRepository.findOne({ where: targetWhere });
    if (!target) throw new NotFoundException('Target user not found');

    const role = await this.roleRepository.findOne({ where: roleWhere });
    if (!role) throw new NotFoundException('Role not found');

    // ── Self-demotion guard: an ADMIN cannot remove their own ADMIN role ──
    if (target.id === actor.id && role.name !== 'ADMIN') {
      throw new BadRequestException('An administrator cannot demote themselves');
    }

    const previousRoleId = target.roleId;
    target.roleId = role.id;
    target.updatedBy = actor.id;
    const saved = await this.userRepository.save(target);

    await this.auditService.logBusinessEvent(
      'user.role_assigned',
      'User',
      target.id,
      actor.id,
      {
        previousRoleId,
        newRoleId: role.id,
        newRoleName: role.name,
        reason: reason ?? null,
        tenantId: actor.tenantId,
      },
    );

    const updated = await this.userRepository.findOne({
      where: { id: target.id, deletedAt: IsNull() },
      relations: ['role'],
    });
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }
}
