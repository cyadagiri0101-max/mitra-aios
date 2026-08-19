import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { ProjectDesignLoadService } from '../services/project-design-load.service';
import {
  CreateProjectDesignLoadDto,
  UpdateProjectDesignLoadDto,
  EstimateDesignLoadDto,
  UpdateProjectDesignLoadStageDto,
} from '../dto/design-load.dto';
import { ProjectDesignLoadStatus } from '../entities/project-design-load.entity';

@ApiTags('Project Design Loads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('design-loads')
export class ProjectDesignLoadController {
  constructor(private readonly loadService: ProjectDesignLoadService) {}

  @Get()
  @Permissions('design_load:read')
  @ApiOperation({ summary: 'List all project design loads' })
  @ApiResponse({ status: 200, description: 'List of project design loads' })
  async findAll(
    @Query('projectId') projectId?: string,
    @Query('status') status?: ProjectDesignLoadStatus,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.loadService.findAll(
      user?.tenantId ?? undefined,
      page ?? 1,
      limit ?? 50,
      projectId,
      status,
      search,
    );
  }

  @Get(':id')
  @Permissions('design_load:read')
  @ApiOperation({ summary: 'Get design load details with stages' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.loadService.findOneWithStages(id, user?.tenantId ?? undefined);
  }

  @Post()
  @Permissions('design_load:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new project design load' })
  async create(
    @Body() dto: CreateProjectDesignLoadDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.loadService.createLoad(dto, user?.id, user?.tenantId ?? undefined);
  }

  @Patch(':id')
  @Permissions('design_load:update')
  @ApiOperation({ summary: 'Update project design load' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDesignLoadDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.loadService.updateLoad(id, dto, user?.id, user?.tenantId ?? undefined);
  }

  @Post(':id/estimate')
  @Permissions('design_load:estimate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-estimate project design load duration and hours' })
  async estimate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EstimateDesignLoadDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.loadService.estimate(id, dto, user?.id, user?.tenantId ?? undefined);
  }

  @Patch('stages/:stageId')
  @Permissions('design_load:update')
  @ApiOperation({ summary: 'Update project design load stage status and actuals' })
  async updateStage(
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() dto: UpdateProjectDesignLoadStageDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.loadService.updateStage(stageId, dto, user?.id, user?.tenantId ?? undefined);
  }

  @Get(':id/candidates')
  @Permissions('design_load:read')
  @ApiOperation({ summary: 'Find qualified engineer candidates for design load / stage' })
  async findCandidates(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('stageId') stageId?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.loadService.findCandidateResources(id, stageId, user?.tenantId ?? undefined);
  }
}
