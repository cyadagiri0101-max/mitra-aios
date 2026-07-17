import {
  IsString, IsOptional, IsEnum, IsUUID, IsNumber, IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DrawingFileType } from '../entities/drawing-analysis.entity';

export class UploadDrawingDto {
  @ApiProperty({ description: 'Project ID to associate the drawing with' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'Original file name' })
  @IsString()
  fileName: string;

  @ApiProperty({ enum: DrawingFileType, description: 'File type (STEP, IGES, PDF, DWG)' })
  @IsEnum(DrawingFileType)
  fileType: DrawingFileType;

  @ApiProperty({ description: 'Base64-encoded file content' })
  @IsString()
  fileContentBase64: string;
}

export class DrawingAnalysisResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty({ enum: DrawingFileType })
  fileType: DrawingFileType;

  @ApiProperty()
  fileUrl: string;

  @ApiPropertyOptional()
  partComplexity?: string;

  @ApiPropertyOptional()
  suggestedMachiningTime?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  riskAreas?: Record<string, any>[];

  @ApiPropertyOptional()
  confidence?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  extractedFeatures?: Record<string, any>[];

  @ApiProperty()
  createdAt: Date;
}
