import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { ScheduleBaselineService } from '../services/schedule-baseline.service';
import { CreateScheduleBaselineDto } from '../dto/schedule-baseline.dto';

@ApiTags('Schedule Baselines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ScheduleBaselineController {
  constructor(private readonly baselineService: ScheduleBaselineService) {}

  @Get(['project/:projectId/baselines', 'projects/:projectId/baselines'])
  @Permissions('baseline:read')
  @ApiOperation({ summary: 'List all schedule baselines for project' })
  @ApiResponse({ status: 200, description: 'List of project baselines' })
  async findAllForProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.baselineService.findAllForProject(projectId, user?.tenantId ?? undefined);
  }

  @Get(['project/:projectId/baselines/active', 'projects/:projectId/baselines/active'])
  @Permissions('baseline:read')
  @ApiOperation({ summary: 'Get active schedule baseline for project' })
  async findActive(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.baselineService.findActiveBaseline(projectId, user?.tenantId ?? undefined);
  }

  @Get(['project/:projectId/baselines/variance', 'projects/:projectId/baselines/variance'])
  @Permissions('baseline:compare')
  @ApiOperation({ summary: 'Calculate schedule and workload variance against baseline' })
  async getVariance(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('baselineId') baselineId?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.baselineService.calculateVariance(projectId, baselineId, user?.tenantId ?? undefined);
  }

  @Post(['project/:projectId/baselines', 'projects/:projectId/baselines'])
  @Permissions('baseline:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new frozen schedule baseline snapshot' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateScheduleBaselineDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.baselineService.createBaseline(projectId, dto, user?.id, user?.tenantId ?? undefined);
  }

  @Post(['project/:projectId/baselines/:id/activate', 'projects/:projectId/baselines/:id/activate'])
  @Permissions('baseline:activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate baseline and supersede previous active baseline' })
  async activate(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.baselineService.activateBaseline(id, user?.id, user?.tenantId ?? undefined);
  }

  @Get('baselines/:id')
  @Permissions('baseline:read')
  @ApiOperation({ summary: 'Get baseline details with snapshot items' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.baselineService.findOneWithItems(id, user?.tenantId ?? undefined);
  }
}
