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
import { DesignSystemService } from '../services/design-system.service';
import { CreateDesignSystemDto, UpdateDesignSystemDto } from '../dto/design-system.dto';
import { DesignSystemStatus } from '../entities/design-system.entity';

@ApiTags('Design Systems & Shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('design-systems')
export class DesignSystemController {
  constructor(private readonly systemService: DesignSystemService) {}

  @Get()
  @Permissions('design_system:read')
  @ApiOperation({ summary: 'List all design systems/workstations' })
  @ApiResponse({ status: 200, description: 'List of design workstations' })
  async findAllSystems(
    @Query('status') status?: DesignSystemStatus,
    @Query('search') search?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.systemService.findAllSystems(user?.tenantId ?? undefined, status, search);
  }

  @Get('shifts')
  @Permissions('design_system:read')
  @ApiOperation({ summary: 'List all configured design shifts' })
  async findAllShifts(@CurrentUser() user?: AuthUser) {
    return this.systemService.findAllShifts(user?.tenantId ?? undefined);
  }

  @Get(':id')
  @Permissions('design_system:read')
  @ApiOperation({ summary: 'Get design system workstation details' })
  async findOneSystem(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.systemService.findOneSystem(id, user?.tenantId ?? undefined);
  }

  @Post()
  @Permissions('design_system:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new design system workstation' })
  async createSystem(
    @Body() dto: CreateDesignSystemDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.systemService.createSystem(dto, user?.id, user?.tenantId ?? undefined);
  }

  @Patch(':id')
  @Permissions('design_system:update')
  @ApiOperation({ summary: 'Update design system workstation' })
  async updateSystem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDesignSystemDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.systemService.updateSystem(id, dto, user?.id, user?.tenantId ?? undefined);
  }

  @Post('seed-defaults')
  @Permissions('design_system:create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seed 10 default CAD workstations and 3 shifts for tenant' })
  async seedDefaults(@CurrentUser() user?: AuthUser) {
    return this.systemService.seedDefaultSystemsAndShifts(user?.id, user?.tenantId ?? undefined);
  }
}
