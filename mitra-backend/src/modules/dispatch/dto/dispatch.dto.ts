import { IsString, IsOptional, IsEnum, IsDateString, IsArray, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DispatchStatus } from '../entities/dispatchplan.entity';

export class CreateDispatchPlanDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(30)
  dispatchNumber?: string;

  @ApiProperty()
  @IsString() @MaxLength(200)
  customerName: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ enum: DispatchStatus })
  @IsOptional() @IsEnum(DispatchStatus)
  status?: DispatchStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200)
  carrier?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  trackingNumber?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  plannedDate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsArray()
  packingList?: Record<string, unknown>[];

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;
}

export class UpdateDispatchPlanDto {
  @ApiPropertyOptional({ enum: DispatchStatus })
  @IsOptional() @IsEnum(DispatchStatus)
  status?: DispatchStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200)
  carrier?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  trackingNumber?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  shippedDate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  deliveredDate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsArray()
  packingList?: Record<string, unknown>[];

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;
}

export class TransitionDispatchPlanDto {
  @ApiProperty({ enum: ['PACK', 'SHIP', 'DELIVER', 'CANCEL'] })
  @IsEnum(['PACK', 'SHIP', 'DELIVER', 'CANCEL'])
  transition: 'PACK' | 'SHIP' | 'DELIVER' | 'CANCEL';

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200)
  carrier?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  trackingNumber?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsArray()
  packingList?: Record<string, unknown>[];

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;
}
