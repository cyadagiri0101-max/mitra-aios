import { IsString, IsOptional, IsUUID, IsBoolean, IsArray, IsNotEmpty, MinLength, MaxLength, IsDateString, ArrayNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateKnowledgeArticleDto {
  @ApiProperty({ description: 'Article title', minLength: 3, maxLength: 300 })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(300)
  title: string;

  @ApiProperty({ description: 'Article markdown content body' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Category UUID reference' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Article summary/abstract' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: 'Search classification tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Project UUID reference' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Originating engineering decision UUID' })
  @IsOptional()
  @IsUUID()
  decisionId?: string;

  @ApiPropertyOptional({ description: 'Target review due date' })
  @IsOptional()
  @IsDateString()
  reviewDueDate?: string;

  @ApiPropertyOptional({ description: 'Article expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateKnowledgeArticleDto extends PartialType(CreateKnowledgeArticleDto) {
  // Direct mutation of status is prohibited; status must transition through dedicated lifecycle endpoints
}

export class SubmitArticleDto {
  @ApiPropertyOptional({ description: 'Target review due date' })
  @IsOptional()
  @IsDateString()
  reviewDueDate?: string;
}

export class ApproveArticleDto {
  @ApiPropertyOptional({ description: 'Article expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class RejectArticleDto {
  @ApiProperty({ description: 'Mandatory reason for review rejection', minLength: 5, maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(2000)
  rejectionReason: string;
}

export class AttachEvidenceDto {
  @ApiProperty({ description: 'Array of validated G13 KnowledgeChunk UUIDs to attach', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  chunkIds: string[];
}
