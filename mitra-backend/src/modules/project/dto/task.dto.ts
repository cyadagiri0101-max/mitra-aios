import { IsString, IsOptional, IsUUID, IsDateString, IsEnum, IsInt, IsNumber, Min, Max, MinLength, MaxLength, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TaskStatus, TaskPriority } from '../entities/projecttask.entity';
import { DependencyType } from '../entities/taskdependency.entity';

export class CreateTaskDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(300) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(3000) description?: string;
  @ApiPropertyOptional({ enum: TaskStatus }) @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM }) @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @ApiPropertyOptional() @IsOptional() @IsUUID() parentTaskId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() milestoneId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assigneeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) assigneeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) estimatedHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(100) @Type(() => Number) progressPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsUUID('4', { each: true }) dependencies?: string[];
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}

export class UpdateTaskStatusDto {
  @ApiProperty({ enum: TaskStatus }) @IsEnum(TaskStatus) status: TaskStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class AddTaskDependencyDto {
  @ApiProperty() @IsUUID() dependsOnTaskId: string;
  @ApiPropertyOptional({ enum: DependencyType, default: DependencyType.FINISH_TO_START })
  @IsOptional() @IsEnum(DependencyType) dependencyType?: DependencyType;
}

export class AddTaskCommentDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(3000) body: string;
}

export class TaskQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 50;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) search?: string;
  @ApiPropertyOptional({ enum: TaskStatus }) @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @ApiPropertyOptional({ enum: TaskPriority }) @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assigneeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() milestoneId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() @Type(() => Boolean) subtasks?: boolean;
}
