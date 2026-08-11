import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
  HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { SalesOrderService } from '../services/sales-order.service';
import {
  CreateSalesOrderDto, UpdateSalesOrderDto, CancelSalesOrderDto,
  SalesOrderFilterDto,
} from '../dto/sales-order.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuditEvent } from '@common/decorators/audit-event.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';

@ApiTags('commercial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commercial/sales-orders')
export class SalesOrderController {
  constructor(private readonly service: SalesOrderService) {}

  @Get()
  @ApiOperation({ summary: 'List sales orders (paginated, filterable)' })
  async findAll(
    @Query() q: PaginationDto,
    @Query() filters: SalesOrderFilterDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAllFiltered(user.tenantId, q.page, q.limit, q.search, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sales order with lines' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findOneWithLines(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('salesOrder:create')
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create sales order (from an accepted quotation or with lines)' })
  async create(
    @Body() dto: CreateSalesOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createSalesOrder(dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('salesOrder:update')
  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update draft sales order' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalesOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateSalesOrder(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('salesOrder:approve')
  @Post(':id/confirm')
  @HttpCode(200)
  @AuditEvent('sales-order:confirmed')
  @ApiOperation({ summary: 'Confirm sales order (DRAFT → CONFIRMED)' })
  async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.confirmSalesOrder(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('salesOrder:approve')
  @Post(':id/complete')
  @HttpCode(200)
  @AuditEvent('sales-order:completed')
  @ApiOperation({ summary: 'Complete sales order (CONFIRMED → COMPLETED)' })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.completeSalesOrder(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('salesOrder:approve')
  @Post(':id/cancel')
  @HttpCode(200)
  @AuditEvent('sales-order:cancelled')
  @ApiOperation({ summary: 'Cancel sales order (reason required)' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelSalesOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.cancelSalesOrder(id, dto, user.id, user.tenantId);
  }
}
