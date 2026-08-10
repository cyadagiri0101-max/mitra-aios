import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

export enum CopilotDomain {
  ENGINEERING = 'engineering',
  MANUFACTURING = 'manufacturing',
  QUALITY = 'quality',
  SERVICE = 'service',
  EXECUTIVE = 'executive',
  COMMERCIAL = 'commercial',
  PROJECT = 'project',
}

export class CopilotMessageDto {
  @ApiProperty({ example: 'Explain this drawing and list the source references.' })
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  message: string;

  @ApiPropertyOptional({ enum: CopilotDomain })
  @IsOptional()
  @IsEnum(CopilotDomain)
  domain?: CopilotDomain;

  @ApiPropertyOptional({ example: 'engineering.drawing.explain' })
  @IsOptional()
  @IsString()
  task?: string;

  @ApiPropertyOptional({ example: 'project-uuid' })
  @IsOptional()
  @IsString()
  selectedProjectId?: string;

  @ApiPropertyOptional({ example: 'drawing-uuid' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ example: 'drawing' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'Recent chat history for scoped memory' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CopilotMessageDto)
  history?: CopilotMessageDto[];
}

export class CopilotChatDto {
  @ApiProperty({ type: CopilotMessageDto })
  @ValidateNested()
  @Type(() => CopilotMessageDto)
  request: CopilotMessageDto;

  @ApiPropertyOptional({ example: 'conversation-uuid' })
  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class CopilotContextDto {
  @ApiProperty({ example: 'drawing' })
  @IsString()
  entityType: string;

  @ApiProperty({ example: 'drawing-uuid' })
  @IsString()
  entityId: string;

  @ApiPropertyOptional({ enum: CopilotDomain })
  @IsOptional()
  @IsEnum(CopilotDomain)
  domain?: CopilotDomain;

  @ApiPropertyOptional({ example: 'explain released drawing' })
  @IsOptional()
  @IsString()
  query?: string;
}

export class PromptExecutionDto extends CopilotChatDto {
  @ApiProperty({ example: 'quality.ncr_explanation' })
  @IsString()
  task: string;
}

export class CopilotReferenceDto {
  @ApiProperty() title: string;
  @ApiProperty() entityType: string;
  @ApiProperty() entityId: string;
  @ApiProperty() sourceDomain: string;
  @ApiProperty() similarity: number;
}

export class CopilotResponseDto {
  @ApiProperty() answer: string;
  @ApiProperty({ enum: CopilotDomain }) domain: CopilotDomain;
  @ApiProperty() promptTemplate: string;
  @ApiProperty() promptVersion: string;
  @ApiProperty() confidence: number;
  @ApiProperty({ type: [CopilotReferenceDto] }) references: CopilotReferenceDto[];
  @ApiProperty() contextSummary: string;
  @ApiPropertyOptional() conversationId?: string;
  @ApiPropertyOptional() modelUsed?: string;
  @ApiPropertyOptional() processingMs?: number;
}
