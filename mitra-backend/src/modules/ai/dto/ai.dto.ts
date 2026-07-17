import {
  IsString, IsOptional, IsEnum, IsBoolean, IsIn,
  MinLength, MaxLength, IsArray, ArrayMaxSize, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AiIntent {
  GENERAL       = 'GENERAL',
  PROJECTS      = 'PROJECTS',
  TRIALS        = 'TRIALS',
  CAPA          = 'CAPA',
  MANUFACTURING = 'MANUFACTURING',
  DISPATCH      = 'DISPATCH',
  SERVICE       = 'SERVICE',
  WORKFLOW      = 'WORKFLOW',
  KNOWLEDGE     = 'KNOWLEDGE',
}

/**
 * FIX M-5: Added HistoryItemDto with @MaxLength(4000) on content and
 * @ArrayMaxSize(20) on the history array to prevent users from inflating
 * the LLM context window with thousands of long messages, which would
 * exhaust server memory and incur excessive AI inference costs.
 */
export class HistoryItemDto {
  @IsIn(['user', 'assistant'])
  role!: string;

  @IsString()
  @MaxLength(4000)
  content!: string;
}

export class AiChatDto {
  @ApiProperty({ example: 'Show me all delayed projects' })
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({ enum: AiIntent, description: 'Hint the AI about which module to query' })
  @IsOptional()
  @IsEnum(AiIntent)
  intent?: AiIntent;

  @ApiPropertyOptional({ description: 'Include previous messages for multi-turn context' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => HistoryItemDto)
  history?: HistoryItemDto[];
}

export class AiAnalysisDto {
  @ApiProperty({ example: 'capa-uuid-here' })
  @IsString()
  entityId: string;

  @ApiProperty({ enum: ['capa', 'trial', 'project', 'service'] })
  @IsString()
  entityType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  question?: string;
}

export class AiChatResponseDto {
  @ApiProperty()
  @IsString()
  answer: string;

  @ApiProperty()
  intent: AiIntent;

  @ApiProperty({ description: 'DB records used to generate the answer' })
  context: Record<string, any>;

  @ApiProperty()
  @IsString()
  modelUsed: string;

  @ApiProperty()
  processingMs: number;

  @ApiProperty()
  aiEnabled: boolean;
}

export class AiHealthResponseDto {
  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  available: boolean;

  @ApiProperty()
  @IsString()
  model: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ollamaVersion?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}
