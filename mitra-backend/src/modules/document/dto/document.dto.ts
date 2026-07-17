import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DocumentCategory { DESIGN='DESIGN', MANUFACTURING='MANUFACTURING', QUALITY='QUALITY', COMMERCIAL='COMMERCIAL', GENERAL='GENERAL' }
export class CreateDocumentVersionDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() fileName: string;
  @ApiProperty() @IsString() originalName: string;
  @ApiProperty() @IsString() minioBucket: string;
  @ApiProperty() @IsString() minioKey: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() entityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() entityType?: string;
  @ApiPropertyOptional({ enum: DocumentCategory }) @IsOptional() @IsEnum(DocumentCategory) category?: DocumentCategory;
  @ApiPropertyOptional() @IsOptional() @IsString() changeSummary?: string;
}
