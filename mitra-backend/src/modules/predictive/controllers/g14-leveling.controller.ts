import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { G14TimelineLevelingService } from '../services/g14-timeline-leveling.service';
import {
  GenerateLevelingRecommendationsDto,
  ReviewRecommendationDto,
  AcceptRecommendationDto,
  ModifyRecommendationDto,
  RejectRecommendationDto,
  ApplyRecommendationDto,
  CancelRecommendationDto,
  QueryRecommendationsDto,
} from '../dto/g14-leveling.dto';

@ApiTags('predictive-timeline-leveling')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/predictive/leveling')
export class G14LevelingController {
  constructor(
    private readonly levelingService: G14TimelineLevelingService,
  ) {}

  @Get('projects/:projectId/risk')
  @ApiOperation({ summary: 'Get aggregated timeline risk summary for a project' })
  async getProjectTimelineRisk(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.levelingService.getProjectTimelineRisk(
      projectId,
      user.tenantId || '',
    );
  }

  @Get('machines/:machineId/risk')
  @ApiOperation({ summary: 'Get aggregated capacity risk summary for a machine' })
  async getMachineCapacityRisk(
    @Param('machineId') machineId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.levelingService.getMachineCapacityRisk(
      machineId,
      user.tenantId || '',
    );
  }

  @Post('recommendations/generate')
  @ApiOperation({ summary: 'Generate advisory human-in-the-loop leveling recommendations' })
  async generateRecommendations(
    @Body() dto: GenerateLevelingRecommendationsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.levelingService.generateRecommendations(
      dto,
      user.tenantId || '',
      user.email || user.id,
    );
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'List leveling recommendations' })
  async listRecommendations(
    @Query() query: QueryRecommendationsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.levelingService.listRecommendations(
      query,
      user.tenantId || '',
    );
  }

  @Get('recommendations/:id')
  @ApiOperation({ summary: 'Get leveling recommendation details' })
  async getRecommendationById(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.levelingService.getRecommendationById(
      id,
      user.tenantId || '',
    );
  }

  @Post('recommendations/:id/review')
  @ApiOperation({ summary: 'Mark recommendation as UNDER_REVIEW' })
  async reviewRecommendation(
    @Param('id') id: string,
    @Body() dto: ReviewRecommendationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.levelingService.reviewRecommendation(
      id,
      dto,
      user.tenantId || '',
      user.email || user.id,
    );
  }

  @Post('recommendations/:id/accept')
  @ApiOperation({ summary: 'Mark recommendation as ACCEPTED' })
  async acceptRecommendation(
    @Param('id') id: string,
    @Body() dto: AcceptRecommendationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.levelingService.acceptRecommendation(
      id,
      dto,
      user.tenantId || '',
      user.email || user.id,
    );
  }

  @Post('recommendations/:id/modify')
  @ApiOperation({ summary: 'Modify recommendation proposal and mark as MODIFIED' })
  async modifyRecommendation(
    @Param('id') id: string,
    @Body() dto: ModifyRecommendationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.levelingService.modifyRecommendation(
      id,
      dto,
      user.tenantId || '',
      user.email || user.id,
    );
  }

  @Post('recommendations/:id/reject')
  @ApiOperation({ summary: 'Reject recommendation and mark as REJECTED' })
  async rejectRecommendation(
    @Param('id') id: string,
    @Body() dto: RejectRecommendationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.levelingService.rejectRecommendation(
      id,
      dto,
      user.tenantId || '',
      user.email || user.id,
    );
  }

  @Post('recommendations/:id/cancel')
  @ApiOperation({ summary: 'Cancel recommendation and mark as CANCELLED' })
  async cancelRecommendation(
    @Param('id') id: string,
    @Body() dto: CancelRecommendationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.levelingService.cancelRecommendation(
      id,
      dto,
      user.tenantId || '',
      user.email || user.id,
    );
  }

  @Post('recommendations/:id/apply')
  @ApiOperation({ summary: 'Explicitly apply accepted/modified recommendation transactionally' })
  async applyRecommendation(
    @Param('id') id: string,
    @Body() dto: ApplyRecommendationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.levelingService.applyRecommendation(
      id,
      dto,
      user.tenantId || '',
      user.email || user.id,
    );
  }
}
