import {
  IsString, IsOptional, IsUUID, IsEnum, IsNumber, IsDateString, IsArray,
  IsObject, IsInt, MinLength, MaxLength, Min, Max, ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  RfqMoldType, RfqPriority, RfqStatus, RfqApprovalStatus, RfqWorkflowState,
} from '../entities/rfq.entity';

export class CreateRfqProductDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  lineNumber?: number;

  @ApiProperty({ example: 'Dashboard Panel' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  productName: string;

  @ApiPropertyOptional({ example: 'DP-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  productCode?: string;

  @ApiPropertyOptional({ example: 'Injection molded ABS panel 400x300 mm' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional({ example: 'NOS', default: 'NOS' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional({ example: 'ABS' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  material?: string;

  @ApiPropertyOptional({ example: 450000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  targetPrice?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  deliveryWeeks?: number;

  @ApiPropertyOptional({ example: 'Customer to provide 3D model' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CreateRfqDto {
  @ApiPropertyOptional({ example: 'uuid-of-customer' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-contact' })
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiProperty({ example: 'Acme Automotive Pvt Ltd' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  customerName: string;

  @ApiPropertyOptional({ example: 'uuid-of-legacy-enquiry' })
  @IsOptional()
  @IsUUID()
  enquiryId?: string;

  @ApiPropertyOptional({ enum: RfqMoldType })
  @IsOptional()
  @IsEnum(RfqMoldType)
  moldType?: RfqMoldType;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  targetQuantity?: number;

  @ApiPropertyOptional({ example: 120000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  annualVolume?: number;

  @ApiPropertyOptional({ example: 'P20 Steel' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  material?: string;

  @ApiPropertyOptional({ example: '130T injection molding machine, 4 cavities' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  machineDetails?: string;

  @ApiPropertyOptional({ example: '2026-11-30' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ enum: RfqPriority, default: RfqPriority.MEDIUM })
  @IsOptional()
  @IsEnum(RfqPriority)
  priority?: RfqPriority;

  @ApiPropertyOptional({ example: 'Gate location constraints per part drawing.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  technicalNotes?: string;

  @ApiPropertyOptional({ type: [Object], example: [{ fileName: 'drawing.pdf', fileKey: 'rfqs/<id>/drawing.pdf' }] })
  @IsOptional()
  @IsArray()
  attachments?: Record<string, unknown>[];

  @ApiPropertyOptional({ type: [CreateRfqProductDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRfqProductDto)
  products?: CreateRfqProductDto[];
}

export class UpdateRfqDto extends PartialType(CreateRfqDto) {}

export class RfqFilterDto {
  @ApiPropertyOptional({ enum: RfqStatus })
  @IsOptional()
  @IsEnum(RfqStatus)
  status?: RfqStatus;

  @ApiPropertyOptional({ enum: RfqWorkflowState })
  @IsOptional()
  @IsEnum(RfqWorkflowState)
  workflowState?: RfqWorkflowState;

  @ApiPropertyOptional({ enum: RfqApprovalStatus })
  @IsOptional()
  @IsEnum(RfqApprovalStatus)
  approvalStatus?: RfqApprovalStatus;

  @ApiPropertyOptional({ enum: RfqPriority })
  @IsOptional()
  @IsEnum(RfqPriority)
  priority?: RfqPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ enum: RfqMoldType })
  @IsOptional()
  @IsEnum(RfqMoldType)
  moldType?: RfqMoldType;
}

export class ExecuteRfqTransitionDto {
  @ApiProperty({ example: 'uuid-of-workflow-transition' })
  @IsUUID()
  transitionId: string;

  @ApiPropertyOptional({ example: 'Approved in commercial review' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;
}

export class CreateRfqRevisionDto {
  @ApiProperty({ example: 'Revised material from P20 to S136' })
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  changeSummary: string;
}

export class RfqProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  rfqId: string;

  @ApiProperty()
  lineNumber: number;

  @ApiProperty()
  productName: string;

  @ApiPropertyOptional()
  productCode: string | null;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unit: string;

  @ApiPropertyOptional()
  material: string | null;

  @ApiPropertyOptional()
  targetPrice: number | null;

  @ApiPropertyOptional()
  deliveryWeeks: number | null;
}

export class RfqResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  rfqNumber: string;

  @ApiPropertyOptional()
  customerId: string | null;

  @ApiProperty()
  customerName: string;

  @ApiPropertyOptional()
  moldType: RfqMoldType | null;

  @ApiProperty({ enum: RfqPriority })
  priority: RfqPriority;

  @ApiProperty({ enum: RfqWorkflowState })
  workflowState: RfqWorkflowState;

  @ApiProperty({ enum: RfqApprovalStatus })
  approvalStatus: RfqApprovalStatus;

  @ApiProperty({ enum: RfqStatus })
  status: RfqStatus;

  @ApiProperty()
  revisionNumber: number;

  @ApiPropertyOptional()
  dueDate: Date | null;

  @ApiPropertyOptional()
  technicalNotes: string | null;

  @ApiPropertyOptional({ type: [Object] })
  attachments: Record<string, unknown>[] | null;

  @ApiPropertyOptional({ type: [RfqProductResponseDto] })
  products: RfqProductResponseDto[];

  @ApiPropertyOptional({ type: [Object] })
  revisions: unknown[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class RfqImportDto {
  @ApiProperty({ type: [Object] })
  @IsArray()
  items: CreateRfqDto[];
}
