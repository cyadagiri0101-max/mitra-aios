import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { NcrService } from '../services/ncr.service';
import { NcrStatus } from '../entities/ncr-record.entity';

const QUALITY_ROLES = ['ADMIN', 'MANAGEMENT', 'QUALITY'];

@ApiTags('quality')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quality/ncr')
export class NcrController {
  constructor(private readonly service: NcrService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY', 'PLANNING', 'PRODUCTION', 'SALES', 'DESIGN')
  @Get()
  async findAll(@Query() q: PaginationDto & { status?: NcrStatus; workOrderId?: string; projectId?: string; severity?: string }, @CurrentUser() user: AuthUser) {
    return this.service.findAll(q, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY', 'PLANNING', 'PRODUCTION')
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles(...QUALITY_ROLES)
  @Post()
  async create(@Body() dto: Record<string, unknown>, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @UseGuards(RolesGuard)
  @Roles(...QUALITY_ROLES)
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Record<string, unknown>, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }

  @UseGuards(RolesGuard)
  @Roles(...QUALITY_ROLES)
  @Patch(':id/transition')
  async transition(@Param('id', ParseUUIDPipe) id: string, @Body() dto: { toStatus: NcrStatus; disposition?: string; action?: string; remarks?: string }, @CurrentUser() user: AuthUser) {
    return this.service.transition(id, dto.toStatus, user, dto);
  }
}
