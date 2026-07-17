import { IsString, IsOptional, IsUUID, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateKnowledgeArticleDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() content: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() summary?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}
export class UpdateKnowledgeArticleDto extends PartialType(CreateKnowledgeArticleDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() publishedAt?: boolean;
}
