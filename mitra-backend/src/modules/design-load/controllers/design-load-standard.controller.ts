import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { DesignLoadStandardService } from '../services/design-load-standard.service';
import {
  CreateDesignStandardDto,
  UpdateDesignStandardDto,
  CreateStandardStageDto,
} from '../dto/design-standard.dto';
import { DesignStandardStatus } from '../entities/design-load-standard.entity';

@ApiTags('Design Standards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('design-standards')
export class DesignLoadStandardController {
  constructor(private readonly standardService: DesignLoadStandardService) {}

  @Get()
  @Permissions('design_standard:read')
  @ApiOperation({ summary: 'List all design standards' })
  @ApiResponse({ status: 200, description: 'List of design standards' })
  async findAll(
    @Query('status') status?: DesignStandardStatus,
    @Query('projectType') projectType?: string,
    @Query('moldType') moldType?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.standardService.findAll(
      user?.tenantId ?? undefined,
      page ?? 1,
      limit ?? 50,
      status,
      projectType,
      moldType,
      search,
    );
  }

  @Get(':id')
  @Permissions('design_standard:read')
  @ApiOperation({ summary: 'Get design standard details with stages' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.standardService.findOneWithStages(id, user?.tenantId ?? undefined);
  }

  @Post()
  @Permissions('design_standard:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new design standard' })
  async create(
    @Body() dto: CreateDesignStandardDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.standardService.createStandard(dto, user?.id, user?.tenantId ?? undefined);
  }

  @Patch(':id')
  @Permissions('design_standard:update')
  @ApiOperation({ summary: 'Update design standard' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDesignStandardDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.standardService.updateStandard(id, dto, user?.id, user?.tenantId ?? undefined);
  }

  @Post(':id/stages')
  @Permissions('design_standard:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add stage to design standard' })
  async addStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateStandardStageDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.standardService.addStage(id, dto, user?.id, user?.tenantId ?? undefined);
  }

  @Delete(':id')
  @Permissions('design_standard:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete design standard' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.standardService.removeStandard(id, user?.id, user?.tenantId ?? undefined);
  }
}
