import {
  IsString, IsOptional, IsNumber, IsArray, IsUUID, IsObject, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BomItemDto {
  @ApiProperty()
  @IsString()
  partNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  leadTime?: number;
}

export class AnalyzeBomDto {
  @ApiProperty({ description: 'Project ID to associate the BOM analysis with' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'Raw BOM data (parts, quantities, materials, etc.)' })
  @IsObject()
  bomData: Record<string, any>;
}

export class BomAnalysisResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  bomData: Record<string, any>;

  @ApiPropertyOptional()
  complexityScore?: number;

  @ApiPropertyOptional()
  riskAreas?: Record<string, any>[];

  @ApiPropertyOptional()
  confidence?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BomItemDto)
  items?: BomItemDto[];

  @ApiProperty()
  createdAt: Date;
}
