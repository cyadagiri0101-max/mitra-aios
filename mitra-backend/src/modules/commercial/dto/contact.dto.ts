import { IsString, IsOptional, IsBoolean, IsEmail, MinLength, MaxLength, IsUUID, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ example: 'john@acme.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1-555-0100' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: '+1-555-0111' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  mobile?: string;

  @ApiPropertyOptional({ example: 'procurement_manager' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  role?: string;

  @ApiPropertyOptional({ example: 'Senior Buyer' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @ApiPropertyOptional({ example: 'Procurement' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ example: { email: true, phone: true, sms: false, whatsapp: true } })
  @IsOptional()
  @IsObject()
  communicationPreferences?: Record<string, boolean>;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ example: 'Prefers calls in the morning' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateContactDto extends PartialType(CreateContactDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;
}

export class StandaloneCreateContactDto extends CreateContactDto {
  @ApiProperty({ example: 'uuid-of-customer' })
  @IsUUID()
  customerId: string;
}

export class ContactResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  email: string | null;

  @ApiPropertyOptional()
  phone: string | null;

  @ApiPropertyOptional()
  mobile: string | null;

  @ApiPropertyOptional()
  role: string | null;

  @ApiPropertyOptional()
  designation: string | null;

  @ApiPropertyOptional()
  department: string | null;

  @ApiPropertyOptional()
  communicationPreferences: Record<string, boolean> | null;

  @ApiProperty()
  isPrimary: boolean;

  @ApiProperty()
  createdAt: Date;
}
