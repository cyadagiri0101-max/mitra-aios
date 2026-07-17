import { IsString, IsOptional, IsEnum, IsInt, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum MachineStatus { ACTIVE='ACTIVE', UNDER_MAINTENANCE='UNDER_MAINTENANCE', IDLE='IDLE', DECOMMISSIONED='DECOMMISSIONED' }
export class CreateMachineTypeDto {
  @ApiProperty() @IsString() typeCode: string;
  @ApiProperty() @IsString() typeName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) standardCostPerHour?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
export class UpdateMachineTypeDto extends PartialType(CreateMachineTypeDto) {}
