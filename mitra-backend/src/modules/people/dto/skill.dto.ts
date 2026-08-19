import {
  IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SkillStatus } from '../entities/skill.entity';

export class CreateSkillDto {
  @ApiProperty({ example: 'MOLD_DESIGN', maxLength: 50 })
  @IsString()
  @IsNotEmpty({ message: 'code is required' })
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Mold Design', maxLength: 200 })
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Injection mold design and DFM' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Design' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ enum: SkillStatus, default: SkillStatus.ACTIVE })
  @IsOptional()
  @IsEnum(SkillStatus)
  status?: SkillStatus;
}

export class UpdateSkillDto {
  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ enum: SkillStatus })
  @IsOptional()
  @IsEnum(SkillStatus)
  status?: SkillStatus;
}