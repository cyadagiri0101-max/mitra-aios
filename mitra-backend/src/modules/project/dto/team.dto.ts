import { IsString, IsOptional, IsUUID, IsDateString, IsInt, IsArray, Min, Max, MinLength, MaxLength, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTeamDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(200) teamName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() leadUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) leadUserName?: string;
}

export class UpdateTeamDto extends PartialType(CreateTeamDto) {}

export class AddTeamMemberDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(200) userName: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() userId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) role?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) department?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) departmentName?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) capacityPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isLead?: boolean;
}

export class UpdateTeamMemberDto extends PartialType(AddTeamMemberDto) {}

export class CreateDepartmentDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(50) code: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(200) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) description?: string;
}

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}
