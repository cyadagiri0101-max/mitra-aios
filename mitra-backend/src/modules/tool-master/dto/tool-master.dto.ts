import { IsString, IsOptional, IsEnum, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum ToolMasterType {
  BM = 'BM',
  IM = 'IM',
}

export class CreateToolMasterDto {
  @ApiProperty({ example: 'BM450' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  toolNo: string;

  @ApiProperty({ enum: ToolMasterType, example: ToolMasterType.BM })
  @IsEnum(ToolMasterType)
  toolType: ToolMasterType;

  @ApiPropertyOptional({ example: 'Shampoo Bottle' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  projectName?: string;

  @ApiPropertyOptional({ example: 'ALPLA' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customerName?: string;

  @ApiPropertyOptional({ example: 'Bottle' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  productName?: string;

  @ApiPropertyOptional({ example: 'H-250' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  machine?: string;

  @ApiPropertyOptional({ example: '16' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  cavity?: string;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  revision?: string;

  @ApiPropertyOptional({ example: 'Blow mold for shampoo bottle' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdateToolMasterDto extends PartialType(CreateToolMasterDto) {}
