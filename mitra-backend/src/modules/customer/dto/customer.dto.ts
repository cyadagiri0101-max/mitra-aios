import { IsString, IsOptional, IsUUID, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateCustomerApprovalDto {
  @ApiProperty() @IsUUID() projectId: string;
  @ApiProperty() @IsString() customerName: string;
  @ApiProperty() @IsString() approvalType: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerContact?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() approvalDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() approvalConditions?: string;
}
export class UpdateCustomerApprovalDto extends PartialType(CreateCustomerApprovalDto) {
  @ApiPropertyOptional({ enum: ['APPROVED','REJECTED','CONDITIONAL','PENDING'] })
  @IsOptional() @IsString() result?: string;
}
