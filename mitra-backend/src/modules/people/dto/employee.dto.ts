import {
  IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum, MaxLength, IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeStatus } from '../entities/employee.entity';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'ENG-1001', maxLength: 30 })
  @IsString()
  @IsNotEmpty({ message: 'employeeCode is required' })
  @MaxLength(30)
  employeeCode: string;

  @ApiProperty({ example: 'Rajesh' })
  @IsString()
  @IsNotEmpty({ message: 'firstName is required' })
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Kumar' })
  @IsString()
  @IsNotEmpty({ message: 'lastName is required' })
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ example: 'rajesh.kumar@mitra.local' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+91 98765 43210' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'Design Engineering' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ example: 'Senior Mold Designer' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @ApiPropertyOptional({ enum: EmployeeStatus, default: EmployeeStatus.ACTIVE })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional({ description: 'Linked platform user account id (optional)' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  employeeCode?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;
}