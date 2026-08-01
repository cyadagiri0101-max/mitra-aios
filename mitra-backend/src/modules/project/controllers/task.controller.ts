import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TaskService } from '../services/task.service';
import {
  CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto, AddTaskDependencyDto,
  AddTaskCommentDto, TaskQueryDto,
} from '../dto/task.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('project-tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('project/:projectId/tasks')
export class TaskController {
  constructor(private readonly service: TaskService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks of a project (pagination, filters, subtasks, dependencies)' })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() q: TaskQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findByProject(projectId, q, user.tenantId ?? undefined);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findOne(id, user.tenantId ?? undefined);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Task comments' })
  async comments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findComments(id, user.tenantId ?? undefined);
  }

  @Get(':id/attachments')
  @ApiOperation({ summary: 'Task attachments' })
  async attachments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAttachments(id, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'SALES')
  @Permissions('project:task:create')
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a task (subtasks via parentTaskId, dependencies)' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(projectId, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'SALES')
  @Permissions('project:task:update')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'SALES')
  @Permissions('project:task:update')
  @Post(':id/status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Change task status (blocks DONE on open dependencies)' })
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.changeStatus(id, dto.status, dto.note ?? null, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'SALES')
  @Permissions('project:task:update')
  @Post(':id/dependencies')
  @HttpCode(201)
  @ApiOperation({ summary: 'Add a dependency (cycle-safe)' })
  async addDependency(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTaskDependencyDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.addDependency(id, dto.dependsOnTaskId, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'SALES')
  @Permissions('project:task:update')
  @Delete(':id/dependencies/:dependsOnTaskId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a dependency' })
  async removeDependency(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('dependsOnTaskId', ParseUUIDPipe) dependsOnTaskId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.service.removeDependency(id, dependsOnTaskId, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'SALES')
  @Permissions('project:task:update')
  @Post(':id/comments')
  @HttpCode(201)
  async addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTaskCommentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.addComment(id, dto.body, user.id, user.email, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'SALES')
  @Permissions('project:task:delete')
  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, user.id, user.tenantId);
  }
}
