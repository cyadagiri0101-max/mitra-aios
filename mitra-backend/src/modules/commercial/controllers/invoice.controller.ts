import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
  HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { InvoiceService } from '../services/invoice.service';
import { CreateInvoiceDto, CancelInvoiceDto, InvoiceFilterDto } from '../dto/invoice.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuditEvent } from '@common/decorators/audit-event.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';

@ApiTags('commercial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commercial/invoices')
export class InvoiceController {
  constructor(private readonly service: InvoiceService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices (paginated, filterable, OVERDUE computed)' })
  async findAll(
    @Query() q: PaginationDto,
    @Query() filters: InvoiceFilterDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAllFiltered(user.tenantId, q.page, q.limit, q.search, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice with lines' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findOneWithLines(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('invoice:create')
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create invoice (from a confirmed sales order or with lines)' })
  async create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createInvoice(dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('invoice:approve')
  @Post(':id/issue')
  @HttpCode(200)
  @AuditEvent('invoice:issued')
  @ApiOperation({ summary: 'Issue invoice (DRAFT → ISSUED)' })
  async issue(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.issueInvoice(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('invoice:approve')
  @Post(':id/cancel')
  @HttpCode(200)
  @AuditEvent('invoice:cancelled')
  @ApiOperation({ summary: 'Cancel invoice (reason required, blocked once paid)' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelInvoiceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.cancelInvoice(id, dto, user.id, user.tenantId);
  }
}
