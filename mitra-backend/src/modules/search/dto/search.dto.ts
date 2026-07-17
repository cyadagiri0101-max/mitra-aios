import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IndexEntityDto {
  @ApiProperty() @IsString() entityType: string;
  @ApiProperty() @IsUUID() entityId: string;
  @ApiProperty() @IsString() displayTitle: string;
  @ApiProperty() @IsString() searchableText: string;
  @ApiPropertyOptional() @IsOptional() @IsString() urlPath?: string;
}
