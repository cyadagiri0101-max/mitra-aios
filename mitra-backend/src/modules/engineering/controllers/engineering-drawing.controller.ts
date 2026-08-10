import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { EngineeringDrawingService } from '../services/engineering-drawing.service';
import {
  CreateDrawingDto, UpdateDrawingDto, CreateDrawingRevisionDto, CheckInDrawingDto, EngineeringQueryDto,
} from '../dto/engineering.dto';
import { ENGINEERING_READ_ROLES, ENGINEERING_WRITE_ROLES } from '../engineering.constants';

@ApiTags('engineering')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('engineering/drawings')
export class EngineeringDrawingController {
  constructor(private readonly service: EngineeringDrawingService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:drawing:read')
  @ApiOperation({ summary: 'List drawings with pagination, filtering, search' })
  async findAll(@Query() q: EngineeringQueryDto, @CurrentUser() user: AuthUser) {
    return this.service.findAllAdvanced(user.tenantId, q as unknown as Record<string, any>);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:drawing:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user.tenantId);
  }

  @Get(':id/revisions')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:drawing:read')
  async listRevisions(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.listRevisions(id, user.tenantId);
  }

  @Get(':id/revisions/latest')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:drawing:read')
  async getLatestRevision(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.getLatestRevision(id, user.tenantId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:drawing:create')
  @ApiOperation({ summary: 'Register a drawing (number auto-generated DRW-YYYY-####)' })
  async create(@Body() dto: CreateDrawingDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto as unknown as Record<string, any>, user.id, user.tenantId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:drawing:update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDrawingDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto as unknown as Record<string, any>, user.id, user.tenantId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('engineering:drawing:delete')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.id, user.tenantId);
  }

  @Post(':id/revisions')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:drawing:checkin')
  async checkIn(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CheckInDrawingDto, @CurrentUser() user: AuthUser) {
    return this.service.checkIn(id, dto as unknown as Record<string, any>, user.id, user.tenantId);
  }

  @Post(':id/checkout')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:drawing:checkout')
  async checkOut(@Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, any>, @CurrentUser() user: AuthUser) {
    return this.service.checkOut(id, body, user.id, user.tenantId);
  }

  @Post(':id/checkout/cancel')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:drawing:checkout')
  @HttpCode(200)
  async cancelCheckOut(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.cancelCheckOut(id, user.id, user.tenantId);
  }

  @Get(':id/compare/:revisionA/:revisionB')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:drawing:compare')
  async compareRevisions(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('revisionA') revisionA: string,
    @Param('revisionB') revisionB: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.compareRevisions(id, revisionA, revisionB, user.tenantId);
  }
}
