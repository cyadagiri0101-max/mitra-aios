import { IsString, IsOptional, IsUUID, IsInt, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMoldStructureDto {
  @ApiProperty() @IsUUID() projectId: string;
  @ApiProperty() @IsString() moldName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() moldType?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number) noOfCavities?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() moldBaseMaterial?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cavityMaterial?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) moldWeightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() runnerType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gateType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ejectionSystem?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) designLifeShots?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}
export class UpdateMoldStructureDto extends PartialType(CreateMoldStructureDto) {}
