import {
  Controller, Get, Post, Param, Body, Query, UseGuards, HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import {
  EngineeringWorkflowService, EngineeringWorkflowActor,
} from '../services/engineering-workflow.service';
import { ENGINEERING_READ_ROLES, ENGINEERING_WRITE_ROLES } from '../engineering.constants';

const VALID_ENTITY_TYPES = new Set(['drawing', 'bom', 'routing']);

@ApiTags('engineering')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('engineering')
export class EngineeringWorkflowController {
  constructor(private readonly service: EngineeringWorkflowService) {}

  private actor(user: AuthUser): EngineeringWorkflowActor {
    return {
      userId: user.id,
      userRole: [user.role],
      userPermissions: user.permissions,
      tenantId: user.tenantId ?? undefined,
    };
  }

  private assertEntityType(entityType: string): void {
    if (!VALID_ENTITY_TYPES.has(entityType)) {
      throw new Error(`Unsupported workflow entityType: ${entityType} — use drawing, bom or routing`);
    }
  }

  @Get(':entityType/:id/workflow')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:workflow:read')
  @ApiOperation({ summary: 'DB-driven workflow state, available transitions and history for a drawing/BOM/routing' })
  async getWorkflow(
    @Param('entityType') entityType: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    this.assertEntityType(entityType);
    return this.service.getWorkflow(entityType, id, this.actor(user));
  }

  @Post(':entityType/:id/workflow/transition')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:workflow:write')
  @HttpCode(200)
  async transition(
    @Param('entityType') entityType: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { transitionId: string; remarks?: string },
    @CurrentUser() user: AuthUser,
  ) {
    this.assertEntityType(entityType);
    return this.service.transition(entityType, id, body.transitionId, this.actor(user), body.remarks);
  }
}
