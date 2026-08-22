import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { EkosKnowledgeLineageService } from '../services/ekos-knowledge-lineage.service';
import { LinkKnowledgeToEntityDto } from '../dto/ekos-knowledge-lineage.dto';

@ApiTags('ekos-knowledge-lineage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/ekos/lineage')
export class EkosKnowledgeLineageController {
  constructor(
    private readonly knowledgeLineageService: EkosKnowledgeLineageService,
  ) {}

  @Get('knowledge/:articleId')
  @ApiOperation({ summary: 'Trace complete upstream sources, evidence, and downstream citations for a G12 Knowledge Article' })
  @Roles('ADMIN', 'MANAGEMENT', 'ENGINEERING', 'PLANNING', 'QUALITY', 'OPERATIONS', 'SALES')
  async getKnowledgeArticleLineage(
    @Param('articleId') articleId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.knowledgeLineageService.getKnowledgeArticleLineage(
      articleId,
      user.tenantId || '',
    );
  }

  @Get('entity/:entityType/:entityId/knowledge')
  @ApiOperation({ summary: 'Get all G12 knowledge articles and lessons learned linked to an authoritative entity' })
  @Roles('ADMIN', 'MANAGEMENT', 'ENGINEERING', 'PLANNING', 'QUALITY', 'OPERATIONS', 'SALES')
  async getEntityKnowledgeLineage(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.knowledgeLineageService.getEntityKnowledgeLineage(
      entityType,
      entityId,
      user.tenantId || '',
    );
  }

  @Get('recommendation/:recommendationId/provenance')
  @ApiOperation({ summary: 'Trace upstream predictive evidence and telemetry signals for a G14 leveling recommendation' })
  @Roles('ADMIN', 'MANAGEMENT', 'ENGINEERING', 'PLANNING', 'QUALITY')
  async getRecommendationProvenance(
    @Param('recommendationId') recommendationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.knowledgeLineageService.getRecommendationProvenance(
      recommendationId,
      user.tenantId || '',
    );
  }

  @Post('knowledge/link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Govern link between a Knowledge Article and an authoritative domain entity' })
  @Roles('ADMIN', 'MANAGEMENT', 'ENGINEERING', 'QUALITY')
  async linkKnowledgeToEntity(
    @Body() dto: LinkKnowledgeToEntityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.knowledgeLineageService.linkKnowledgeToSourceEntity(
      dto,
      user.tenantId || '',
      user,
    );
  }
}
