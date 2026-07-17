import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { TrialObservationService } from '../services/trialobservation.service';
import { CreateTrialObservationDto, UpdateTrialObservationDto } from '../dto/trial.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';

@ApiTags('quality')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quality/trials')
export class TrialObservationController {
  constructor(private readonly service: TrialObservationService) {}

  @Get()
  async findAll(
    @Query() q: PaginationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAll(user.tenantId, q.page, q.limit);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findOne(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('quality:create')
  @Post()
  async create(
    @Body() dto: CreateTrialObservationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(dto as unknown as Record<string, unknown>, user.id, user.tenantId ?? undefined);
  }

  // FIX H-5: SALES or CUSTOMER users could edit trial observations
  // without this guard. Quality records must be protected.
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY', 'PRODUCTION')
  @Permissions('quality:close')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateTrialObservationDto>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto as unknown as Record<string, unknown>, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('quality:delete')
  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, user.id, user.tenantId);
  }
}