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
  @ApiOperation({ summary: 'Semantic knowledge search' })
  @ApiQuery({ name: 'q', required: true, type: String })
  async search(
    @Query('q') q: string,
    @CurrentUser() user: AuthUser,
    @Query('topK') topK?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.search({
      query: q,
      tenantId: user.tenantId ?? 'default',
      topK: Number(topK ?? 8),
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
