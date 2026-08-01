import { IsString, IsOptional, IsUUID, IsDateString, IsEnum, IsInt, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum EnquiryStatus { DRAFT='DRAFT', SUBMITTED='SUBMITTED', UNDER_REVIEW='UNDER_REVIEW', CONVERTED='CONVERTED', LOST='LOST', CANCELLED='CANCELLED' }
export enum EnquirySource { EMAIL='EMAIL', PHONE='PHONE', WALK_IN='WALK_IN', REFERRAL='REFERRAL', WEBSITE='WEBSITE', EXHIBITION='EXHIBITION' }
export enum MoldType { INJECTION='INJECTION', BLOW='BLOW', THIN_WALL='THIN_WALL', IBM='IBM', MOLD_BASE='MOLD_BASE', FIXTURE='FIXTURE', PRODUCT_DESIGN='PRODUCT_DESIGN', JOB_WORK='JOB_WORK' }

export class CreateEnquiryDto {
  @ApiProperty() @IsString() customerName: string;
  @ApiProperty() @IsString() productName: string;
  @ApiProperty() @IsDateString() enquiryDate: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() customerEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerContact?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string;
  @ApiPropertyOptional({ enum: MoldType }) @IsOptional() @IsEnum(MoldType) moldType?: MoldType;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) cavitation?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() materialType?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) annualVolume?: number;
  @ApiPropertyOptional({ enum: EnquirySource }) @IsOptional() @IsEnum(EnquirySource) source?: EnquirySource;
  @ApiPropertyOptional() @IsOptional() @IsDateString() requiredDeliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}
/**
 * UpdateEnquiryDto — profile fields only.
 * SECURITY (C-3 remediation): `status` is deliberately excluded; status
 * changes flow exclusively through the workflow engine.
 */
export class UpdateEnquiryDto extends PartialType(CreateEnquiryDto) {}
