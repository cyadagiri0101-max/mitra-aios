import { IsString, IsOptional, IsUUID, IsDateString, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ChangeType { DESIGN='DESIGN', MATERIAL='MATERIAL', PROCESS='PROCESS', TOOLING='TOOLING', CUSTOMER_REQUEST='CUSTOMER_REQUEST', CAPA='CAPA' }
export enum ECRPriority { LOW='LOW', MEDIUM='MEDIUM', HIGH='HIGH', CRITICAL='CRITICAL' }

export class CreateECRDto {
  @ApiProperty() @IsUUID() projectId: string;
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() changeDescription: string;
  @ApiProperty() @IsString() changeReason: string;
  @ApiPropertyOptional({ enum: ChangeType }) @IsOptional() @IsEnum(ChangeType) changeType?: ChangeType;
  @ApiPropertyOptional({ enum: ECRPriority }) @IsOptional() @IsEnum(ECRPriority) priority?: ECRPriority;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) costImpact?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() requiredByDate?: string;
}
export class UpdateECRDto extends PartialType(CreateECRDto) {
  @ApiPropertyOptional({ enum: ['DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED'] })
  @IsOptional() @IsString() status?: string;
}
