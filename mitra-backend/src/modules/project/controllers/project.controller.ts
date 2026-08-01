import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProjectService } from '../services/project.service';
import {
  CreateProjectDto, UpdateProjectDto, TransitionStageDto, ProjectQueryDto, WorkflowTransitionDto,
} from '../dto/project.dto';
import { ProjectWorkflowService } from '../services/project-workflow.service';
import { ProjectActivityService } from '../services/project-activity.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('project')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('project')
export class ProjectController {
  constructor(
    private readonly service: ProjectService,
    private readonly workflowService: ProjectWorkflowService,
    private readonly activityService: ProjectActivityService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List projects (pagination, filtering, sorting, search)' })
  async findAll(
    @Query() q: ProjectQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAllAdvanced(user.tenantId ?? undefined, q);
  }

  @Get('dashboard/stats')
  async stats(@CurrentUser() user: AuthUser) {
    return this.service.getDashboardStats(user.tenantId ?? undefined);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findOne(id, user.tenantId ?? undefined);
  }

  @Get(':id/health')
  async health(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.service.findOne(id, user.tenantId ?? undefined);
    return this.service.computeHealth(id);
  }

  @Get(':id/workflow')
  @ApiOperation({ summary: 'Get project workflow state, available transitions and history (DB-driven)' })
  async workflow(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workflowService.getWorkflow(id, {
      userId: user.id,
      userRole: user.role ? [user.role] : [],
      userPermissions: user.permissions,
      tenantId: user.tenantId,
    });
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Get project activity timeline' })
  async activity(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: PaginationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.activityService.findByProject(id, user.tenantId ?? undefined, q.page ?? 1, q.limit ?? 50);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('project:transition')
  @Post(':id/transition')
  @HttpCode(200)
  async transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionStageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.transitionStage(id, dto.toStage, user.id, dto.remarks);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('project:transition')
  @Post(':id/workflow/transition')
  @HttpCode(200)
  @ApiOperation({ summary: 'Execute a database-driven workflow transition' })
  async workflowTransition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WorkflowTransitionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workflowService.transition(id, dto.transitionId, {
      userId: user.id,
      userRole: user.role ? [user.role] : [],
      userPermissions: user.permissions,
      tenantId: user.tenantId,
    }, dto.remarks);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('project:create')
  @Post()
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('project:update')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Permissions('project:delete')
  @Post('admin/refresh-health')
  @HttpCode(200)
  async refreshHealth(@CurrentUser() user: AuthUser) {
    return this.service.refreshAllHealthStatuses(user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('project:delete')
  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, user.id, user.tenantId);
  }
}
