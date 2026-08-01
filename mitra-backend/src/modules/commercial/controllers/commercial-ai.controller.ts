import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { CommercialAiService } from '../services/commercial-ai.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';

/**
 * Read-only AI readiness endpoints.
 *
 * These expose the stored AI context (document metadata, embeddings
 * placeholder, knowledge references, customer context, project references)
 * for future inference integrations. No inference is performed.
 */
@ApiTags('commercial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commercial/ai-context')
export class CommercialAiController {
  constructor(private readonly service: CommercialAiService) {}

  // M-6 fix: the static "type/:entityType" route MUST be registered before
  // the dynamic ":entityType/:entityId" route, otherwise "type" is captured
  // as an entityType and the request dies on ParseUUIDPipe.
  @Get('type/:entityType')
  @ApiOperation({ summary: 'List AI contexts for an entity type' })
  async listByType(
    @Param('entityType') entityType: string,
    @CurrentUser() user: AuthUser,
    @Query('take') take?: string,
  ) {
    return this.service.listByEntityType(entityType, user.tenantId, take ? Number(take) : 100);
  }

  @Get(':entityType/:entityId')
  @ApiOperation({ summary: 'Get AI context for a commercial entity (AI-ready hooks)' })
  async getContext(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getContext(entityType, entityId, user.tenantId);
  }
}
