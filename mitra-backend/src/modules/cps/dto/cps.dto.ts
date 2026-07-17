import { IsString, IsOptional, IsUUID, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CPSReviewStatus { DRAFT='DRAFT', IN_REVIEW='IN_REVIEW', APPROVED='APPROVED', REJECTED='REJECTED' }
export class CreateCPSReviewDto {
  @ApiProperty() @IsUUID() projectId: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() reviewDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() designStage?: string;
}
export class ApproveCPSDto {
  @ApiProperty({ enum: ['APPROVED','REJECTED','CONDITIONAL'] }) @IsString() decision: string;
  @ApiPropertyOptional() @IsOptional() @IsString() comments?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() conditions?: string;
}
