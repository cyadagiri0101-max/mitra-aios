import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectService } from '../services/project.service';
import { CreateProjectDto, UpdateProjectDto, TransitionStageDto } from '../dto/project.dto';
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
  constructor(private readonly service: ProjectService) {}

  @Get()
  async findAll(
    @Query() q: PaginationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAll(user.tenantId ?? undefined, q.page ?? 1, q.limit ?? 20);
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
    // Enforce tenant isolation before computing health — prevents cross-tenant
    // information disclosure via the /health endpoint (findOne throws 404 if
    // the project belongs to a different tenant).
    await this.service.findOne(id, user.tenantId ?? undefined);
    return this.service.computeHealth(id);
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
  @Permissions('project:create')
  @Post()
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(dto, user.id, user.tenantId);
  }

  // FIX H-4: Any authenticated user (incl. CUSTOMER, SERVICE) could update
  // any project without this guard. Added to match POST guard level.
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
    // ADMIN-only: recalculates health_status for all projects in the caller's tenant.
    // Super-admins (no tenantId) refresh across all tenants — use with caution.
    return this.service.refreshAllHealthStatuses(user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('project:delete')
  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, user.id, user.tenantId);
  }
}