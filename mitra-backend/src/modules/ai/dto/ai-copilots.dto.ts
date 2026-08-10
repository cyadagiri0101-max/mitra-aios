import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CopilotDomain } from './copilot.dto';
import { AiPlatformChatDto } from './ai-platform.dto';

export class CopilotCapabilityDto {
  @ApiProperty({ example: 'engineering.drawings.explain' })
  key: string;

  @ApiProperty({ example: 'Explain a drawing' })
  title: string;

  @ApiProperty({ example: 'Explain the referenced drawing, dimensions, revisions...' })
  description: string;

  @ApiProperty({ example: 'engineering.explain_drawing' })
  promptKey: string;

  @ApiProperty({ example: ['engineering.drawings'] })
  tools: string[];

  @ApiProperty({ example: ['Compare revisions', 'Find similar drawings'] })
  suggestedActions: string[];

  @ApiProperty({ example: ['What are the latest revisions?'] })
  followUpQuestions: string[];
}

export class CopilotSummaryDto {
  @ApiProperty({ enum: CopilotDomain })
  domain: CopilotDomain;

  @ApiProperty({ example: 'Engineering Copilot' })
  label: string;

  @ApiProperty({ example: 'Drawing, BOM, process-planning, and engineering-review assistance.' })
  description: string;

  @ApiProperty({ example: 15 })
  capabilityCount: number;
}

export class CopilotPlatformChatDto extends AiPlatformChatDto {
  @ApiPropertyOptional({ example: 'engineering.drawings.explain', description: 'Explicit capability key; falls back to intent detection' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  capability?: string;
}
