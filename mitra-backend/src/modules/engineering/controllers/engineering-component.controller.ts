import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { EngineeringComponentService } from '../services/engineering-component.service';
import { CreateComponentDto, AlternateComponentDto, EngineeringQueryDto } from '../dto/engineering.dto';
import { ENGINEERING_READ_ROLES, ENGINEERING_WRITE_ROLES } from '../engineering.constants';

@ApiTags('engineering')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('engineering/components')
export class EngineeringComponentController {
  constructor(private readonly service: EngineeringComponentService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:component:read')
  async findAll(@Query() q: EngineeringQueryDto, @CurrentUser() user: AuthUser) {
    return this.service.findAll(user.tenantId, q as unknown as Record<string, any>);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:component:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user.tenantId);
  }

  @Get(':id/alternates')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:component:read')
  async listAlternates(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.listAlternates(id, user.tenantId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:component:create')
  async create(@Body() dto: CreateComponentDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto as unknown as Record<string, any>, user.id, user.tenantId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:component:update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, any>, @CurrentUser() user: AuthUser) {
    return this.service.update(id, body, user.id, user.tenantId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('engineering:component:delete')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.id, user.tenantId);
  }

  @Post(':id/alternates')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:component:update')
  async addAlternate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AlternateComponentDto, @CurrentUser() user: AuthUser) {
    return this.service.addAlternate(id, dto as unknown as Record<string, any>, user.id, user.tenantId);
  }

  @Delete('alternates/:alternateId')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:component:update')
  @HttpCode(204)
  async removeAlternate(@Param('alternateId', ParseUUIDPipe) alternateId: string, @CurrentUser() user: AuthUser) {
    return this.service.removeAlternate(alternateId, user.id, user.tenantId);
  }
}
