import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { EngineeringReviewService } from '../services/engineering-review.service';
import {
  CreateReviewRequestDto, ReviewDecisionDto, AddReviewCommentDto,
  AssignReviewersDto, AssignmentDecisionDto, EngineeringQueryDto,
} from '../dto/engineering.dto';
import { ENGINEERING_READ_ROLES, ENGINEERING_WRITE_ROLES } from '../engineering.constants';

@ApiTags('engineering')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('engineering/reviews')
export class EngineeringReviewController {
  constructor(private readonly service: EngineeringReviewService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:review:read')
  @ApiOperation({ summary: 'List review requests (pagination, filter by status/entityType)' })
  async findAll(@Query() q: EngineeringQueryDto, @CurrentUser() user: AuthUser) {
    return this.service.findAllAdvanced(user.tenantId, q as unknown as Record<string, any>);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:review:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user.tenantId);
  }

  @Get(':id/comments')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:review:read')
  async listComments(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.listComments(id, user.tenantId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:review:create')
  @ApiOperation({ summary: 'Create review request (number auto-generated RVR-YYYY-####)' })
  async create(@Body() dto: CreateReviewRequestDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto as unknown as Record<string, any>, user.id, user.tenantId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:review:update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, any>, @CurrentUser() user: AuthUser) {
    return this.service.update(id, body, user.id, user.tenantId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('engineering:review:update')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.id, user.tenantId);
  }

  @Post(':id/decide')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:review:approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve / reject / request changes on a review' })
  async decide(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewDecisionDto, @CurrentUser() user: AuthUser) {
    return this.service.decide(id, dto.decision as any, dto.comment ?? null, user.id, user.tenantId);
  }

  @Post(':id/comments')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:review:update')
  async addComment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddReviewCommentDto, @CurrentUser() user: AuthUser) {
    return this.service.addComment(id, dto as unknown as Record<string, any>, user.id, user.tenantId);
  }

  @Post(':id/comments/:commentId/resolve')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:review:update')
  @HttpCode(200)
  async resolveComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.resolveComment(id, commentId, user.id, user.tenantId);
  }

  @Delete(':id/comments/:commentId')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:review:update')
  @HttpCode(204)
  async removeComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeComment(id, commentId, user.id, user.tenantId);
  }

  // ── Multi-reviewer assignments (Sprint 2.3.1 G-5) ────────────────────────

  @Get(':id/assignments')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:review:read')
  @ApiOperation({ summary: 'List reviewer assignments for a review request' })
  async listAssignments(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.listAssignments(id, user.tenantId);
  }

  @Post(':id/assignments')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:review:assign')
  @ApiOperation({ summary: 'Assign one or more reviewers (idempotent per assignee)' })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignReviewersDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.assign(id, dto.assignees as any, user.id, user.tenantId);
  }

  @Post(':id/assignments/:assigneeId/decide')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:review:approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Record an individual reviewer decision (auto-rollup of review status)' })
  async decideAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assigneeId', ParseUUIDPipe) assigneeId: string,
    @Body() dto: AssignmentDecisionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.decideAssignment(id, assigneeId, dto.decision as any, dto.comment ?? null, user.id, user.tenantId);
  }
}
