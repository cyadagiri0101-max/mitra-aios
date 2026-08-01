import { IsOptional, IsInt, Min, Max, IsBoolean, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/** Query params for the Gantt/timeline endpoint. */
export class TimelineQueryDto {
  @ApiPropertyOptional({ description: 'Include task-level rows (default true)' })
  @IsOptional() @Type(() => Boolean) @IsBoolean() includeTasks?: boolean;

  @ApiPropertyOptional({ description: 'Include milestone rows (default true)' })
  @IsOptional() @Type(() => Boolean) @IsBoolean() includeMilestones?: boolean;

  @ApiPropertyOptional({ description: 'Only include critical path tasks' })
  @IsOptional() @Type(() => Boolean) @IsBoolean() criticalPathOnly?: boolean;
}
