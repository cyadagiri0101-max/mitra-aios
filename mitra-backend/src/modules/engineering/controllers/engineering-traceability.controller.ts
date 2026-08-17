import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { EngineeringTraceabilityService } from '../services/engineering-traceability.service';
import { ENGINEERING_READ_ROLES } from '../engineering.constants';

@ApiTags('engineering')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('engineering/traceability')
export class EngineeringTraceabilityController {
  constructor(private readonly service: EngineeringTraceabilityService) {}

  @Get('project/:projectId')
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:traceability:read')
  @ApiOperation({ summary: 'Full engineering traceability for a project (drawings → BOM → routing → manufacturing → quality)' })
  async byProject(@Param('projectId', ParseUUIDPipe) projectId: string, @CurrentUser() user: AuthUser) {
    return this.service.byProject(projectId, user.tenantId);
  }

  @Get('entity')
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:traceability:read')
  @ApiOperation({ summary: 'Trace a specific engineering entity by type + id' })
  async byEntity(
    @Query('entityType') entityType: string,
    @Query('entityId', ParseUUIDPipe) entityId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.byEntity(entityType, entityId, user.tenantId);
  }

  @Get('revision-impact')
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:traceability:read')
  @ApiOperation({ summary: 'Trace manufacturing and quality impact of an engineering revision' })
  async getRevisionImpact(
    @Query('entityType') entityType: string,
    @Query('entityId', ParseUUIDPipe) entityId: string,
    @Query('revision') revision: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getRevisionImpact(entityType, entityId, revision, user.tenantId);
  }
}
