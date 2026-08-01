import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Dedicated role-assignment payload (C-1 remediation).
 * This is the ONLY way a user's role may be changed at runtime.
 */
export class AssignUserRoleDto {
  @ApiProperty({ example: 'uuid-of-role' })
  @IsUUID()
  roleId: string;

  @ApiPropertyOptional({ example: 'Promoted to Sales Manager' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
