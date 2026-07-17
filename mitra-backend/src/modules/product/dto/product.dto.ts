import { IsString, IsOptional, IsEnum, IsUUID, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ProductStatus } from '../entities/product.entity';

export class CreateProductDto {
  @ApiProperty() @IsString() @MaxLength(200) name: string;
  @ApiProperty() @IsString() @MaxLength(30) productCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) supplierName?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() supplierId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ type: 'number' }) @IsOptional() @IsNumber() unitPrice?: number;
  @ApiPropertyOptional({ enum: ProductStatus }) @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
