import { IsString, IsOptional, IsInt, IsUUID, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCustomerAttachmentDto {
  @ApiProperty({ example: 'GST-Certificate.pdf' })
  @IsString()
  @MaxLength(255)
  fileName: string;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fileType?: string;

  @ApiProperty({ example: 'customers/<customerId>/gst-certificate.pdf' })
  @IsString()
  @MaxLength(500)
  fileKey: string;

  @ApiPropertyOptional({ example: 'https://minio:9000/mitra-customer/...' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ example: 245760 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @ApiPropertyOptional({ example: 'a3f5...' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  checksumSha256?: string;
}

export class CustomerAttachmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  fileName: string;

  @ApiPropertyOptional()
  fileType: string | null;

  @ApiProperty()
  fileKey: string;

  @ApiPropertyOptional()
  fileUrl: string | null;

  @ApiPropertyOptional()
  sizeBytes: string | null;

  @ApiPropertyOptional()
  bucket: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  updatedBy: string | null;

  @ApiProperty()
  version: number;
}
