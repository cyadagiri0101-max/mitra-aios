import { IsString, IsOptional, IsUUID, IsInt, Min, Max, MinLength, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProjectDocumentType, ProjectDocumentStatus } from '../entities/projectdocument.entity';

export class CreateProjectDocumentDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(300) title: string;
  @ApiProperty({ description: 'Original file name' }) @IsString() @MinLength(1) @MaxLength(300) fileName: string;
  @ApiPropertyOptional({ enum: ProjectDocumentType, default: ProjectDocumentType.OTHER })
  @IsOptional() @IsEnum(ProjectDocumentType) documentType?: ProjectDocumentType;
  @ApiPropertyOptional() @IsOptional() @IsUUID() folderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(3000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) mimeType?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number) fileSize?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class UpdateProjectDocumentDto extends PartialType(CreateProjectDocumentDto) {}

export class CreateProjectFolderDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) folderName: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() parentFolderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) sequence?: number;
}

export class ReleaseProjectDocumentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) remarks?: string;
}

/** Multipart document upload: metadata fields arrive as form fields. */
export class UploadProjectDocumentDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(300) title: string;
  @ApiPropertyOptional({ enum: ProjectDocumentType, default: ProjectDocumentType.OTHER })
  @IsOptional() @IsEnum(ProjectDocumentType) documentType?: ProjectDocumentType;
  @ApiPropertyOptional() @IsOptional() @IsUUID() folderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(3000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

/** Multipart version upload. */
export class UploadProjectDocumentVersionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class DocumentQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) search?: string;
  @ApiPropertyOptional({ enum: ProjectDocumentType }) @IsOptional() @IsEnum(ProjectDocumentType) documentType?: ProjectDocumentType;
  @ApiPropertyOptional({ enum: ProjectDocumentStatus }) @IsOptional() @IsEnum(ProjectDocumentStatus) status?: ProjectDocumentStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() folderId?: string;
}
