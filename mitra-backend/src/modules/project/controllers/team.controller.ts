import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TeamService } from '../services/team.service';
import {
  CreateTeamDto, UpdateTeamDto, AddTeamMemberDto, UpdateTeamMemberDto,
  CreateDepartmentDto, UpdateDepartmentDto,
} from '../dto/team.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('project-teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('project/:projectId/teams')
export class TeamController {
  constructor(private readonly service: TeamService) {}

  @Get()
  @ApiOperation({ summary: 'List teams of a project (with members)' })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findByProject(projectId, user.tenantId ?? undefined);
  }

  @Get('/availability')
  @ApiOperation({ summary: 'Member capacity & availability across project teams' })
  async availability(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.availability(projectId, user.tenantId ?? undefined);
  }

  @Get('/departments')
  @ApiOperation({ summary: 'List departments' })
  async departments(@CurrentUser() user: AuthUser) {
    return this.service.findDepartments(user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('project:team:create')
  @Post('/departments')
  @HttpCode(201)
  async createDepartment(
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createDepartment(dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('project:team:update')
  @Patch('/departments/:departmentId')
  async updateDepartment(
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateDepartment(departmentId, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('project:team:create')
  @Post()
  @HttpCode(201)
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTeamDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(projectId, dto, user.id, user.tenantId);
  }

  @Get(':teamId')
  async findOne(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findOne(teamId, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('project:team:update')
  @Patch(':teamId')
  async update(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: UpdateTeamDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(teamId, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('project:team:delete')
  @Delete(':teamId')
  @HttpCode(204)
  async remove(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(teamId, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('project:team:update')
  @Post(':teamId/members')
  @HttpCode(201)
  @ApiOperation({ summary: 'Add a member to a team' })
  async addMember(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: AddTeamMemberDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.addMember(teamId, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('project:team:update')
  @Patch('/members/:memberId')
  async updateMember(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateTeamMemberDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateMember(memberId, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('project:team:update')
  @Delete('/members/:memberId')
  @HttpCode(204)
  async removeMember(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeMember(memberId, user.id, user.tenantId);
  }
}
