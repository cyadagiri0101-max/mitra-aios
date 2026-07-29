import { IsString, IsOptional, IsUUID, IsObject, IsArray, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';

export class CreateRfqDto {
  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty({ example: { mold_type: 'injection', cavity_count: 4, material: 'P20' } })
  @IsObject()
  specifications: Record<string, unknown>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachments?: string[];
}

export class UpdateRfqDto extends PartialType(CreateRfqDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class RfqResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  customerName?: string;

  @ApiProperty()
  referenceNumber: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  specifications: Record<string, unknown>;

  @ApiPropertyOptional()
  attachments: string[] | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
