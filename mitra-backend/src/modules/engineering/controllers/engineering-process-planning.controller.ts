import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { EngineeringProcessPlanningService } from '../services/engineering-process-planning.service';
import {
  CreateWorkCenterDto, CreateRoutingDto, CreateOperationDto, RoutingRevisionDto, EngineeringQueryDto,
} from '../dto/engineering.dto';
import { ENGINEERING_READ_ROLES, ENGINEERING_WRITE_ROLES } from '../engineering.constants';

@ApiTags('engineering')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('engineering')
export class EngineeringProcessPlanningController {
  constructor(private readonly service: EngineeringProcessPlanningService) {}

  // ── Work centers ──────────────────────────────────────────────────────────

  @Get('work-centers')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:workcenter:read')
  async findWorkCenters(@Query() q: EngineeringQueryDto, @CurrentUser() user: AuthUser) {
    return this.service.findWorkCenters(user.tenantId, q as unknown as Record<string, any>);
  }

  @Get('work-centers/:id')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:workcenter:read')
  async findWorkCenter(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findWorkCenter(id, user.tenantId);
  }

  @Post('work-centers')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:workcenter:create')
  async createWorkCenter(@Body() dto: CreateWorkCenterDto, @CurrentUser() user: AuthUser) {
    return this.service.createWorkCenter(dto as unknown as Record<string, any>, user.id, user.tenantId);
  }

  @Patch('work-centers/:id')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:workcenter:update')
  async updateWorkCenter(@Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, any>, @CurrentUser() user: AuthUser) {
    return this.service.updateWorkCenter(id, body, user.id, user.tenantId);
  }

  @Delete('work-centers/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('engineering:workcenter:delete')
  @HttpCode(204)
  async removeWorkCenter(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.removeWorkCenter(id, user.id, user.tenantId);
  }

  // ── Routings ──────────────────────────────────────────────────────────────

  @Get('routings')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:routing:read')
  @ApiOperation({ summary: 'List routings with operations (pagination, search)' })
  async findAll(@Query() q: EngineeringQueryDto, @CurrentUser() user: AuthUser) {
    return this.service.findAllAdvanced(user.tenantId, q as unknown as Record<string, any>);
  }

  @Get('routings/:id')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:routing:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user.tenantId);
  }

  @Get('routings/:id/with-operations')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:routing:read')
  @ApiOperation({ summary: 'Routing with ordered operations and totals' })
  async getRoutingWithOperations(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.getRoutingWithOperations(id, user.tenantId);
  }

  @Get('routings/:id/operations')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:routing:read')
  async listOperations(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.listOperations(id, user.tenantId);
  }

  @Post('routings')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:routing:create')
  @ApiOperation({ summary: 'Create routing (number auto-generated RTG-YYYY-####)' })
  async create(@Body() dto: CreateRoutingDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto as unknown as Record<string, any>, user.id, user.tenantId);
  }

  @Patch('routings/:id')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:routing:update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, any>, @CurrentUser() user: AuthUser) {
    return this.service.update(id, body, user.id, user.tenantId);
  }

  @Delete('routings/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('engineering:routing:delete')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.id, user.tenantId);
  }

  @Post('routings/:id/operations')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:routing:update')
  async addOperation(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateOperationDto, @CurrentUser() user: AuthUser) {
    return this.service.addOperation(id, dto as unknown as Record<string, any>, user.id, user.tenantId);
  }

  @Patch('routings/:id/operations/:operationId')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:routing:update')
  async updateOperation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('operationId', ParseUUIDPipe) operationId: string,
    @Body() body: Record<string, any>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateOperation(id, operationId, body, user.id, user.tenantId);
  }

  @Delete('routings/:id/operations/:operationId')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:routing:update')
  @HttpCode(204)
  async removeOperation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('operationId', ParseUUIDPipe) operationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeOperation(id, operationId, user.id, user.tenantId);
  }

  // ── Routing revisions (Sprint 2.3.1 G-4) ─────────────────────────────────

  @Get('routings/:id/revisions')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:routing:read')
  @ApiOperation({ summary: 'List immutable routing revision snapshots' })
  async listRevisions(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.listRevisions(id, user.tenantId);
  }

  @Post('routings/:id/revisions')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:routing:version')
  @ApiOperation({ summary: 'Snapshot routing + operations into a new version' })
  async createRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RoutingRevisionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createRevision(id, dto as unknown as Record<string, any>, user.id, user.tenantId);
  }

  @Get('routings/:id/revisions/compare/:versionA/:versionB')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:routing:read')
  @ApiOperation({ summary: 'Compare two routing revision snapshots' })
  async compareRevisions(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionA') versionA: string,
    @Param('versionB') versionB: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.compareRevisions(id, Number(versionA), Number(versionB), user.tenantId);
  }
}
