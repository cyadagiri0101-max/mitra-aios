import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MilestoneService } from '../services/milestone.service';
import {
  CreateMilestoneTemplateDto, UpdateMilestoneTemplateDto, CreateMilestoneTemplateItemDto,
  UpdateMilestoneTemplateItemDto, CreateMilestoneDto, UpdateMilestoneDto, CompleteMilestoneDto, ApproveMilestoneDto,
} from '../dto/milestone.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

const MILESTONE_READ_ROLES = ['ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'CUSTOMER'];

@ApiTags('project-milestones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('project/:projectId/milestones')
export class MilestoneController {
  constructor(private readonly service: MilestoneService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...MILESTONE_READ_ROLES)
  @Permissions('project:milestone:read')
  @ApiOperation({ summary: 'List milestones of a project (with dependency names)' })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findByProject(projectId, user.tenantId ?? undefined);
  }

  // ── Templates (declared before :id so they are not captured by it) ─────────

  @Get('/templates/all')
  @UseGuards(RolesGuard)
  @Roles(...MILESTONE_READ_ROLES)
  @Permissions('project:milestone:read')
  @ApiOperation({ summary: 'List milestone templates' })
  async listTemplates(@CurrentUser() user: AuthUser) {
    return this.service.findAllTemplates(user.tenantId ?? undefined);
  }

  @Get('/templates/:templateId')
  @UseGuards(RolesGuard)
  @Roles(...MILESTONE_READ_ROLES)
  @Permissions('project:milestone:read')
  @ApiOperation({ summary: 'Get milestone template with ordered items' })
  async getTemplate(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findTemplate(templateId, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('project:milestone:create')
  @Post('/templates')
  @HttpCode(201)
  async createTemplate(
    @Body() dto: CreateMilestoneTemplateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createTemplate(dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('project:milestone:update')
  @Patch('/templates/:templateId')
  async updateTemplate(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() dto: UpdateMilestoneTemplateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateTemplate(templateId, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('project:milestone:delete')
  @Delete('/templates/:templateId')
  @HttpCode(204)
  async deleteTemplate(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeTemplate(templateId, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('project:milestone:create')
  @Post('/templates/:templateId/items')
  @HttpCode(201)
  async addItem(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() dto: CreateMilestoneTemplateItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.addTemplateItem(templateId, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('project:milestone:update')
  @Patch('/templates/items/:itemId')
  async updateItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateMilestoneTemplateItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateTemplateItem(itemId, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('project:milestone:delete')
  @Delete('/templates/items/:itemId')
  @HttpCode(204)
  async deleteItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeTemplateItem(itemId, user.id, user.tenantId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(...MILESTONE_READ_ROLES)
  @Permissions('project:milestone:read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findOne(id, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('project:milestone:create')
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a milestone manually (or from a template item)' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateMilestoneDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(projectId, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('project:milestone:update')
  @Post('/refresh-delays')
  @HttpCode(200)
  @ApiOperation({ summary: 'Re-sync milestone delay status (marks overdue milestones DELAYED)' })
  async refreshDelays(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.refreshDelays(projectId, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('project:milestone:update')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMilestoneDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('project:milestone:update')
  @Post(':id/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark a milestone complete (checks dependencies; requires approval if configured)' })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteMilestoneDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.complete(
      id,
      dto.actualDate ? new Date(dto.actualDate) : null,
      dto.remarks ?? null,
      user.id,
      user.tenantId,
    );
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY')
  @Permissions('project:milestone:approve')
  @Post(':id/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve a milestone (finalizes completion)' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.approve(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('project:milestone:delete')
  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, user.id, user.tenantId);
  }
}
