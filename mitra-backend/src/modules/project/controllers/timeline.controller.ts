import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TimelineService } from '../services/timeline.service';
import { TimelineQueryDto } from '../dto/timeline.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('project-timeline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('project/:projectId/timeline')
export class TimelineController {
  constructor(private readonly service: TimelineService) {}

  @Get()
  @ApiOperation({ summary: 'Gantt-ready timeline: rows, dependency links, critical path (CPM)' })
  async build(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() q: TimelineQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.build(projectId, q, user.tenantId ?? undefined);
  }
}
