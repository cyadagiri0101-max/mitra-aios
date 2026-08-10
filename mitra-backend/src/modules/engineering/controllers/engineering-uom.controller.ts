import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { EngineeringUomConversionService } from '../services/engineering-uom-conversion.service';
import {
  UomConversionCreateDto, UomConversionUpdateDto, EngineeringQueryDto,
} from '../dto/engineering.dto';
import { ENGINEERING_READ_ROLES, ENGINEERING_WRITE_ROLES } from '../engineering.constants';

@ApiTags('engineering')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('engineering/uoms')
export class EngineeringUomController {
  constructor(private readonly service: EngineeringUomConversionService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:uom:read')
  @ApiOperation({ summary: 'List unit conversions (pagination, search)' })
  async findAll(@Query() q: EngineeringQueryDto, @CurrentUser() user: AuthUser) {
    return this.service.findAll(user.tenantId, q as unknown as Record<string, any>);
  }

  @Get('convert')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:uom:read')
  @ApiOperation({ summary: 'Convert a value between units (direct → reverse → identity)' })
  async convert(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('value') value: string,
    @CurrentUser() user: AuthUser,
  ) {
    const converted = await this.service.convert(Number(value), from, to, user.tenantId);
    return { from: from?.toUpperCase(), to: to?.toUpperCase(), value: Number(value), converted };
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:uom:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user.tenantId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:uom:update')
  @ApiOperation({ summary: 'Create a unit conversion rule' })
  async create(@Body() dto: UomConversionCreateDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto as unknown as Record<string, any>, user.id, user.tenantId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:uom:update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UomConversionUpdateDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto as unknown as Record<string, any>, user.id, user.tenantId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('engineering:uom:update')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.id, user.tenantId);
  }
}
