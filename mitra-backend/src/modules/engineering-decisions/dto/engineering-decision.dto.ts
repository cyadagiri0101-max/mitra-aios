import {
  IsString, IsOptional, IsEnum, IsUUID, IsDateString, MaxLength, IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DecisionType } from '../entities/engineering-decision.entity';

export class CreateEngineeringDecisionDto {
  @ApiProperty({ example: 'Select cooling channel layout for cavity core' })
  @IsString()
  @IsNotEmpty({ message: 'title is required' })
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Project ID in scope of this engineering decision' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ enum: DecisionType, default: DecisionType.OTHER })
  @IsOptional()
  @IsEnum(DecisionType)
  decisionType?: DecisionType;

  @ApiPropertyOptional({ example: 'Why this change is needed' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Background and constraints' })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({ example: 'Option A (parallel), Option B (series)' })
  @IsOptional()
  @IsString()
  optionsConsidered?: string;

  @ApiPropertyOptional({ example: 'Option A' })
  @IsOptional()
  @IsString()
  selectedOption?: string;

  @ApiPropertyOptional({ example: 'Faster cycle time with acceptable tooling cost' })
  @IsOptional()
  @IsString()
  rationale?: string;

  @ApiPropertyOptional({ example: 'Adopt parallel cooling layout' })
  @IsOptional()
  @IsString()
  decision?: string;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString()
  decisionDate?: string;

  @ApiPropertyOptional({ description: 'Owner of the decision (platform user id)' })
  @IsOptional()
  @IsUUID()
  decisionOwnerId?: string;

  @ApiPropertyOptional({ example: 'drawing_revision', description: 'Related artifact type' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  relatedEntityType?: string;

  @ApiPropertyOptional({ description: 'Related artifact id' })
  @IsOptional()
  @IsUUID()
  relatedEntityId?: string;
}

export class UpdateEngineeringDecisionDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Project ID in scope of this engineering decision' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ enum: DecisionType })
  @IsOptional()
  @IsEnum(DecisionType)
  decisionType?: DecisionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  optionsConsidered?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  selectedOption?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rationale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  decision?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  decisionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  decisionOwnerId?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  relatedEntityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  relatedEntityId?: string;
}

export class RejectDecisionDto {
  @ApiProperty({ example: 'Insufficient dimensional evidence for the proposed change' })
  @IsString()
  @IsNotEmpty({ message: 'reason is required when rejecting a decision' })
  @MaxLength(2000)
  reason: string;
}

export class SupersedeDecisionDto {
  @ApiProperty({ example: 'Revised cooling layout after mold trials' })
  @IsString()
  @IsNotEmpty({ message: 'title is required for the successor decision' })
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ enum: DecisionType, default: DecisionType.OTHER })
  @IsOptional()
  @IsEnum(DecisionType)
  decisionType?: DecisionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  optionsConsidered?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  selectedOption?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rationale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  decision?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  decisionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  decisionOwnerId?: string;
}
