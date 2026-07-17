import { IsString, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNoteDto {
  @ApiProperty() @IsString() entityType: string;
  @ApiProperty() @IsUUID() entityId: string;
  @ApiProperty() @IsString() content: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPinned?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isInternal?: boolean;
}
