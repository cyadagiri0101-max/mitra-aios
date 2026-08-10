import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString,
  Max, MaxLength, Min, MinLength,
} from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { CopilotDomain } from './copilot.dto';

export class AiPlatformChatDto {
  @ApiProperty({ example: 'Summarize open NCRs for this project.' })
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  message: string;

  @ApiProperty({ enum: CopilotDomain })
  @IsEnum(CopilotDomain)
  domain: CopilotDomain;

  @ApiPropertyOptional({ example: 'quality.ncr_explanation' })
  @IsOptional()
  @IsString()
  task?: string;

  @ApiPropertyOptional({ example: 'project-uuid' })
  @IsOptional()
  @IsString()
  selectedProjectId?: string;

  @ApiPropertyOptional({ example: 'ncr-uuid' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ example: 'ncr' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ example: 'conversation-uuid' })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional({ example: 'ollama:phi3' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: ['quality.ncrs'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tools?: string[];

  @ApiPropertyOptional({ description: 'Shared arguments passed to every requested tool' })
  @IsOptional()
  @IsObject()
  toolArgs?: Record<string, unknown>;
}

export class AiPlatformContextDto {
  @ApiProperty({ enum: CopilotDomain })
  @IsEnum(CopilotDomain)
  domain: CopilotDomain;

  @ApiProperty({ example: 'drawing' })
  @IsString()
  entityType: string;

  @ApiProperty({ example: 'drawing-uuid' })
  @IsString()
  entityId: string;

  @ApiPropertyOptional({ example: 'explain released drawing' })
  @IsOptional()
  @IsString()
  query?: string;
}

export class AiPromptCreateDto {
  @ApiProperty({ example: 'quality.custom_check' })
  @IsString()
  @MaxLength(150)
  key: string;

  @ApiPropertyOptional({ example: 'v2' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  version?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional({ example: 'quality' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  task?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 'Check {{message}} against {{context}}' })
  @IsString()
  @MinLength(10)
  template: string;

  @ApiPropertyOptional({ example: ['message', 'context'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class AiPromptUpdateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) key?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) locale?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) task?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(10) template?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) variables?: string[];
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class AiPromptListDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  @ApiPropertyOptional() @IsOptional() @IsString() locale?: string;
}

export class AiToolExecuteDto {
  @ApiProperty({ example: 'quality.ncrs' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: { status: 'OPEN', limit: 5 } })
  @IsOptional()
  @IsObject()
  args?: Record<string, unknown>;
}

export class AiConversationPinDto {
  @ApiProperty({ example: 'conversation-uuid' })
  @IsString()
  conversationId: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional({ example: 'Follow-up needed with quality team' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AiConversationListDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() @Type(() => Boolean) pinnedOnly?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(50) @Type(() => Number) limit?: number;
}

export class AiAuditListDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() userId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() action?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() domain?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() @Type(() => Boolean) injectionOnly?: boolean;
}
