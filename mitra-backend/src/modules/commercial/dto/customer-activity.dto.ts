import { IsString, IsOptional, IsEnum, MaxLength, IsUUID, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CustomerActivityType } from '../entities/customer-activity.entity';

export class CreateCustomerActivityDto {
  @ApiProperty({ enum: CustomerActivityType, example: CustomerActivityType.SYSTEM })
  @IsEnum(CustomerActivityType)
  activityType: CustomerActivityType;

  @ApiProperty({ example: 'Discussed annual mold maintenance contract.' })
  @IsString()
  @MaxLength(5000)
  description: string;

  @ApiPropertyOptional({ example: 'rfq' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  referenceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateCustomerActivityDto extends PartialType(CreateCustomerActivityDto) {}
