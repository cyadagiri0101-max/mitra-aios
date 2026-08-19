import {
  IsString, IsOptional, IsEnum, IsUUID, IsDateString, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProficiencyLevel, EmployeeSkillStatus } from '../entities/employee-skill.entity';

export class AssignEmployeeSkillDto {
  @ApiProperty()
  @IsUUID()
  skillId: string;

  @ApiPropertyOptional({ enum: ProficiencyLevel, default: ProficiencyLevel.BEGINNER })
  @IsOptional()
  @IsEnum(ProficiencyLevel)
  proficiencyLevel?: ProficiencyLevel;

  @ApiPropertyOptional({ example: 'ISO 9001 Internal Auditor' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  certification?: string;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional({ example: '2028-09-01', description: 'Certification validity end' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ enum: EmployeeSkillStatus, default: EmployeeSkillStatus.ACTIVE })
  @IsOptional()
  @IsEnum(EmployeeSkillStatus)
  status?: EmployeeSkillStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEmployeeSkillDto {
  @ApiPropertyOptional({ enum: ProficiencyLevel })
  @IsOptional()
  @IsEnum(ProficiencyLevel)
  proficiencyLevel?: ProficiencyLevel;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  certification?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ enum: EmployeeSkillStatus })
  @IsOptional()
  @IsEnum(EmployeeSkillStatus)
  status?: EmployeeSkillStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}