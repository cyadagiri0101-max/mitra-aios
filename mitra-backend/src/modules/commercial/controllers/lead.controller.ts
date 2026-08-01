import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
  HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { LeadService } from '../services/lead.service';
import { CreateLeadDto, UpdateLeadDto, ConvertLeadDto, LeadFilterDto } from '../dto/lead.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuditEvent } from '@common/decorators/audit-event.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';

@ApiTags('commercial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commercial/leads')
export class LeadController {
  constructor(private readonly service: LeadService) {}

  @Get()
  @ApiOperation({ summary: 'List leads (paginated, filter by source/status/priority/owner)' })
  async findAll(
    @Query() q: PaginationDto,
    @Query() filters: LeadFilterDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAllFiltered(user.tenantId, q.page, q.limit, q.search, filters);
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Lead pipeline summary (KPIs for the lead dashboard)' })
  async pipeline(@CurrentUser() user: AuthUser) {
    return this.service.getPipelineSummary(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findById(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('lead:create')
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create lead' })
  async create(
    @Body() dto: CreateLeadDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createLead(dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('lead:update')
  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update lead (incl. status, probability, priority)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateLead(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('lead:update')
  @Post(':id/convert')
  @HttpCode(201)
  @AuditEvent('lead:converted')
  @ApiOperation({ summary: 'Convert lead into a customer' })
  async convert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertLeadDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.convert(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('lead:delete')
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete lead' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, user.id, user.tenantId);
  }
}
