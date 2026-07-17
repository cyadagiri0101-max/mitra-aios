import { IsString, IsOptional, IsUUID, IsDateString, IsEnum, IsInt, IsNumber, Min, Max, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum MoldType { INJECTION='INJECTION', BLOW='BLOW', THIN_WALL='THIN_WALL', IBM='IBM', MOLD_BASE='MOLD_BASE', FIXTURE='FIXTURE', PRODUCT_DESIGN='PRODUCT_DESIGN', JOB_WORK='JOB_WORK' }

export class CreateProjectDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(200) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) description?: string;
  @ApiProperty() @IsString() @MinLength(2) customerName: string;
  @ApiProperty() @IsString() @MinLength(2) productName: string;
  @ApiPropertyOptional({ enum: MoldType }) @IsOptional() @IsEnum(MoldType) moldType?: MoldType;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(128) @Type(() => Number) cavitation?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() materialType?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() targetDeliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) projectValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectManagerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
}
export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
export class TransitionStageDto {
  @ApiProperty({ example: 'DESIGN_INITIATED' }) @IsString() @MinLength(1) @MaxLength(64) toStage: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) remarks?: string;
}
