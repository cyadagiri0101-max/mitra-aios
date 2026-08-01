import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { EngineeringChangeRequestService } from '../services/engineeringchangerequest.service';
import { CreateECRDto, UpdateECRDto } from '../dto/ecr.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';

@ApiTags('ecr-eco')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ecr')
export class EngineeringChangeRequestController {
  constructor(private readonly service: EngineeringChangeRequestService) {}

  @Get()
  async findAll(@Query() q: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.service.findAll(user.tenantId, q.page, q.limit);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Post()
  async create(@Body() dto: CreateECRDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto as unknown as Record<string, unknown>, user.id, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateECRDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto as unknown as Record<string, unknown>, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.id, user.tenantId);
  }
}