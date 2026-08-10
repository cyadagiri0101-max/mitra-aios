import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PaginationDto } from '@common/dto/pagination.dto';
import { KnowledgeCatalogService } from '../services/knowledgecatalog.service';

@ApiTags('knowledge')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('knowledge/catalog')
export class KnowledgeCatalogController {
  constructor(private readonly service: KnowledgeCatalogService) {}

  @Get()
  async findAll(
    @Query() q: PaginationDto & { search?: string; entityType?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAll(user.tenantId ?? 'default', q.page, q.limit, q.search, q.entityType);
  }
}
