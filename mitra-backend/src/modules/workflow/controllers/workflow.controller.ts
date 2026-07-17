import {
  Controller, Get, Post, Body, Param, ParseUUIDPipe,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { MOLD_ALLOWED_TRANSITIONS } from '../services/workflow.service';
import { WorkflowService } from '../services/workflow.service';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

class ExecuteTransitionDto {
  @ApiProperty({ example: 'transition-uuid' })
  @IsString() @MinLength(1)
  transitionId: string;

  @ApiPropertyOptional({ example: 'Design review completed, all checklist items cleared' })
  @IsOptional() @IsString() @MaxLength(1000)
  remarks?: string;
}

class TransitionByStageDto {
  @ApiProperty({ example: 'DESIGN_RELEASED' })
  @IsString() @MinLength(1) @MaxLength(64)
  toStage: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(1000)
  remarks?: string;
}

@ApiTags('Workflow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflow')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  // Stage reference — @Public() so the UI can show available stages without auth
  // FIX L-6: Removed @Public() — workflow topology should not be exposed
  // to unauthenticated users (reveals internal state machine design).
  @Get('stages/mold-project')
  @ApiOperation({ summary: 'Get all MITRA mold project lifecycle stages (public)' })
  getMoldStages() {
    return Object.entries(MOLD_ALLOWED_TRANSITIONS).map(([stage, next]) => ({
      stage,
      allowedNext: next,
    }));
  }

  @Get('states')
  @ApiOperation({ summary: 'Get all workflow states' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.workflowService.findAllStates(user.tenantId ?? undefined);
  }

  @Get('instance/entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get workflow instance for a specific entity' })
  getForEntity(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return this.workflowService.findInstanceByEntity(entityType, entityId);
  }

  @Get('instance/:instanceId/history')
  @ApiOperation({ summary: 'Get workflow transition history' })
  getHistory(@Param('instanceId') instanceId: string) {
    return this.workflowService.getInstanceHistory(instanceId);
  }

  @Post('instance/:instanceId/transition')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('workflow:transition', 'workflow:approve')
  @ApiOperation({ summary: 'Execute a workflow transition' })
  executeTransition(
    @Param('instanceId', ParseUUIDPipe) instanceId: string,
    @Body() body: ExecuteTransitionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workflowService.executeTransition(instanceId, body.transitionId, {
      userId:          user.id,
      userRole:        user.role ? [user.role] : [],
      userPermissions: user.permissions ?? [],
      tenantId:        user.tenantId ?? undefined,
      remarks:         body.remarks,
    });
  }
}
