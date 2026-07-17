import { IsString, IsOptional, IsUUID, IsEnum, IsNumber, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum DesignPartStatus { ACTIVE='ACTIVE', OBSOLETE='OBSOLETE', IN_REVISION='IN_REVISION', RELEASED='RELEASED' }
export class CreateDesignPartDto {
  @ApiProperty() @IsString() partNumber: string;
  @ApiProperty() @IsString() partName: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() materialGrade?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() heatTreatment?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) hardnessHrc?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() surfaceFinish?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) weightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
export class UpdateDesignPartDto extends PartialType(CreateDesignPartDto) {
  @ApiPropertyOptional({ enum: DesignPartStatus }) @IsOptional() @IsEnum(DesignPartStatus) status?: DesignPartStatus;
}
