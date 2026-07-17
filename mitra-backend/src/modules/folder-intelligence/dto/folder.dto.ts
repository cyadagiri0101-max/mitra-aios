import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFolderScanJobDto {
  @ApiProperty() @IsString() jobName: string;
  @ApiProperty() @IsString() rootPath: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scanType?: string;
}
