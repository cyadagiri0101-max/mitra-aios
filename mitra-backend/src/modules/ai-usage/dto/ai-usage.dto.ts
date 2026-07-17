import {
  IsString, IsOptional, IsNumber, IsUUID, IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AiUsageDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiProperty()
  @IsString()
  prompt: string;

  @ApiProperty()
  @IsString()
  modelName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  responseTimeMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  tokenEstimate?: number;
}

export class AiUsageSummaryDto {
  @ApiProperty()
  totalCalls: number;

  @ApiProperty()
  totalTokens: number;

  @ApiProperty()
  averageResponseTimeMs: number;

  @ApiProperty()
  callsByModel: Record<string, number>;

  @ApiProperty()
  periodStart: Date;

  @ApiProperty()
  periodEnd: Date;
}
