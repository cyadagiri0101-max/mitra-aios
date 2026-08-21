import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { KnowledgeArticleService } from '../services/knowledgearticle.service';
import {
  CreateKnowledgeArticleDto,
  UpdateKnowledgeArticleDto,
  SubmitArticleDto,
  ApproveArticleDto,
  RejectArticleDto,
  AttachEvidenceDto,
} from '../dto/knowledge.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';

@ApiTags('knowledge')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('knowledge/articles')
export class KnowledgeArticleController {
  constructor(private readonly service: KnowledgeArticleService) {}

  @Get()
  @ApiOperation({ summary: 'Paginated list of knowledge articles for authenticated tenant' })
  async findAll(
    @Query() q: PaginationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAll(user.tenantId, q.page, q.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get knowledge article by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findOne(id, user.tenantId);
  }

  @Get(':id/revisions')
  @ApiOperation({ summary: 'Get complete revision lineage history for an article family' })
  async getRevisionHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getRevisionHistory(id, user.tenantId);
  }

  @Get(':id/evidence')
  @ApiOperation({ summary: 'Get all validated G13 grounded evidence references for an article' })
  async getEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getEvidence(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Post()
  @ApiOperation({ summary: 'Create a new knowledge article in DRAFT state' })
  async create(
    @Body() dto: CreateKnowledgeArticleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(dto, user.id, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Post('from-decision/:decisionId')
  @ApiOperation({ summary: 'Generate a governed KnowledgeArticle DRAFT from an APPROVED EngineeringDecision' })
  async createFromDecision(
    @Param('decisionId', ParseUUIDPipe) decisionId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createArticleDraftFromDecision(decisionId, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Post(':id/evidence')
  @ApiOperation({ summary: 'Attach validated G13 KnowledgeChunks as grounded evidence to a draft article' })
  async attachEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttachEvidenceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.attachEvidence(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Delete(':id/evidence/:evidenceId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Detach evidence reference from draft article and re-sequence citations' })
  async detachEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('evidenceId', ParseUUIDPipe) evidenceId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.detachEvidence(id, evidenceId, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Post(':id/revisions')
  @ApiOperation({ summary: 'Create a new draft revision (vN+1) from a published article' })
  async createRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createRevision(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Patch(':id')
  @ApiOperation({ summary: 'Update draft knowledge article content' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKnowledgeArticleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit draft knowledge article for technical/quality review' })
  async submitForReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitArticleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.submitForReview(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY')
  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve and publish knowledge article (atomically supersedes predecessor revision)' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveArticleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.approveAndPublish(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY')
  @Post(':id/publish')
  @ApiOperation({ summary: 'Alias: Publish knowledge article (atomically supersedes predecessor revision)' })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveArticleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.approveAndPublish(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY')
  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject review of knowledge article with mandatory reason' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectArticleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.rejectReview(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Post(':id/reopen')
  @ApiOperation({ summary: 'Reopen rejected article back to DRAFT for editing' })
  async reopen(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.reopenRejected(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY')
  @Post(':id/supersede')
  @ApiOperation({ summary: 'Mark published article as superseded' })
  async supersede(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.markSuperseded(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY')
  @Post(':id/expire')
  @ApiOperation({ summary: 'Mark published article as expired' })
  async expire(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.markExpired(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft delete knowledge article' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, user.id, user.tenantId);
  }
}