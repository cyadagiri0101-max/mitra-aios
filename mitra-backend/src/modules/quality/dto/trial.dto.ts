import { IsString, IsOptional, IsUUID, IsDateString, IsEnum, IsNumber, IsInt, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum TrialType { INTERNAL='INTERNAL', CUSTOMER='CUSTOMER', RETRIAL='RETRIAL' }
export enum TrialResult { PASS='PASS', FAIL='FAIL', CONDITIONAL='CONDITIONAL', PENDING='PENDING' }

export class CreateTrialObservationDto {
  @ApiProperty() @IsUUID() projectId: string;
  @ApiProperty() @IsDateString() trialDate: string;
  @ApiPropertyOptional({ enum: TrialType }) @IsOptional() @IsEnum(TrialType) trialType?: TrialType;
  @ApiPropertyOptional() @IsOptional() @IsUUID() machineId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shift?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) moldTemperatureC?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) materialTemperatureC?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) injectionPressureBar?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) cycleTimeSeconds?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) shotsTaken?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) goodParts?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) rejectedParts?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() correctiveActions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerRepresentative?: string;
  @ApiPropertyOptional({ enum: TrialResult }) @IsOptional() @IsEnum(TrialResult) result?: TrialResult;
}
export class UpdateTrialObservationDto extends PartialType(CreateTrialObservationDto) {}
