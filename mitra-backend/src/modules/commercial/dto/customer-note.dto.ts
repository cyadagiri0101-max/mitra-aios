import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateCustomerNoteDto {
  @ApiProperty({ example: 'Prefers email communication for all commercial matters.' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({ example: 'GENERAL' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

export class UpdateCustomerNoteDto extends PartialType(CreateCustomerNoteDto) {}
