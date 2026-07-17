import { IsString, IsOptional, IsUUID, IsEnum, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CapaStatus, CapaType } from '../entities/capaverification.entity';

export class CreateCapaDto {
  @ApiProperty({ example: 'CA-001' })
  @IsString()
  @MaxLength(30)
  capaNumber: string;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  trialId?: string;

  @ApiPropertyOptional({ enum: CapaType, default: CapaType.CORRECTIVE })
  @IsOptional()
  @IsEnum(CapaType)
  capaType?: CapaType;

  @ApiProperty({ example: 'Injection molding part shows flashing around the ejector pin area.' })
  @IsString()
  @MaxLength(2000)
  problemDescription: string;

  @ApiPropertyOptional({ example: 'Root cause identified as insufficient clamp pressure.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rootCause?: string;

  @ApiPropertyOptional({ example: 'Increase clamp pressure and inspect tool alignment.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  correctiveAction?: string;

  @ApiPropertyOptional({ example: 'Review processing plan and update mold maintenance schedule.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  preventiveAction?: string;

  @ApiPropertyOptional({ type: 'string', format: 'date' })
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiPropertyOptional({ enum: CapaStatus, default: CapaStatus.OPEN })
  @IsOptional()
  @IsEnum(CapaStatus)
  status?: CapaStatus;
}

export class UpdateCapaDto extends PartialType(CreateCapaDto) {}
