import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

/**
 * UpdateUserDto — profile fields only.
 *
 * SECURITY (C-1 remediation): `roleId` is intentionally omitted from this DTO.
 * Role changes are only permitted through the dedicated, ADMIN-gated
 * `POST /users/:id/assign-role` endpoint (see RoleAssignmentService).
 * Password changes are also excluded here — they must go through
 * AuthService.changePassword.
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'roleId'] as const),
) {}
