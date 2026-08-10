import { Controller, Get, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiProjectionService } from '../services/ai-projection.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

/**
 * AI-ready integration endpoints (Sprint 2.2 preparation only — no
 * inference). Each endpoint returns a structured envelope; when an AI
 * provider is registered, the same endpoints serve real predictions.
 */
@ApiTags('project-ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'CUSTOMER')
@Permissions('project:read')
@Controller('project/:projectId/ai')
export class AiProjectionController {
  constructor(private readonly service: AiProjectionService) {}

  @Get('risk-prediction')
  @ApiOperation({ summary: 'Predicted project risk level (AI hook — not configured yet)' })
  async riskPrediction(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.predictRisk(projectId, { tenantId: user.tenantId });
  }

  @Get('delay-prediction')
  @ApiOperation({ summary: 'Predicted schedule delay in days (AI hook — not configured yet)' })
  async delayPrediction(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.predictDelay(projectId, { tenantId: user.tenantId });
  }

  @Get('resource-recommendations')
  @ApiOperation({ summary: 'Resource recommendations (AI hook — not configured yet)' })
  async resourceRecommendations(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.recommendResources(projectId, { tenantId: user.tenantId });
  }

  @Get('similar-projects')
  @ApiOperation({ summary: 'Similar project lookup (AI hook — not configured yet)' })
  async similarProjects(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findSimilarProjects(projectId, { tenantId: user.tenantId });
  }

  @Get('timeline-optimization')
  @ApiOperation({ summary: 'Timeline optimization suggestions (AI hook — not configured yet)' })
  async timelineOptimization(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.optimizeTimeline(projectId, { tenantId: user.tenantId });
  }

  @Get('meeting-summary')
  @ApiOperation({ summary: 'Meeting summaries (AI hook — not configured yet)' })
  async meetingSummary(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.summarizeMeetings(projectId, { tenantId: user.tenantId });
  }
}
