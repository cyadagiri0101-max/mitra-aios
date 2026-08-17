import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { KnowledgeSearchService } from '../services/knowledge-search.service';
import { EmbeddingEntityType } from '@modules/ai/entities/knowledge-embedding.entity';

@ApiTags('knowledge')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('knowledge')
export class KnowledgeSearchController {
  constructor(private readonly service: KnowledgeSearchService) {}

  @Get('search')
  @ApiOperation({ summary: 'Unified engineering knowledge & document search' })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'domain', required: false, type: String })
  @ApiQuery({ name: 'articleType', required: false, type: String })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'material', required: false, type: String })
  @ApiQuery({ name: 'process', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'topK', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  async search(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('domain') domain?: string,
    @Query('articleType') articleType?: string,
    @Query('projectId') projectId?: string,
    @Query('material') material?: string,
    @Query('process') process?: string,
    @Query('status') status?: string,
    @Query('topK') topK?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.search({
      query: q,
      tenantId: user.tenantId ?? 'default',
      domain,
      articleType,
      projectId,
      material,
      process,
      status,
      topK: topK ? Number(topK) : undefined,
      page: Number(page ?? 1),
      limit: Number(limit ?? 10),
    });
  }

  @Get('similar')
  @ApiOperation({ summary: 'Similar knowledge lookup using the catalog search text' })
  async similar(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.similar(entityType as EmbeddingEntityType, entityId, user.tenantId ?? 'default');
  }
}
