import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
  HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { QuotationService } from '../services/quotation.service';
import { QuotationAcceptanceService } from '../services/quotation-acceptance.service';
import {
  CreateQuotationDto, UpdateQuotationDto, AcceptQuotationDto, RejectQuotationDto,
  ApproveQuotationDto, ReviseQuotationDto, QuotationFilterDto,
} from '../dto/quotation.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuditEvent } from '@common/decorators/audit-event.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';

@ApiTags('commercial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commercial/quotations')
export class QuotationController {
  constructor(
    private readonly service: QuotationService,
    private readonly acceptanceService: QuotationAcceptanceService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List quotations (paginated, filter by status/customer/currency)' })
  async findAll(
    @Query() q: PaginationDto,
    @Query() filters: QuotationFilterDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAllFiltered(user.tenantId, q.page, q.limit, q.search, filters);
  }

  @Get('margins/summary')
  @ApiOperation({ summary: 'Margin summary across quotations' })
  async marginSummary(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getMarginSummary(user.tenantId, from, to);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quotation with items' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findOneWithItems(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('quotation:create')
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create quotation (from RFQ or enquiry, with priced items)' })
  async create(
    @Body() dto: CreateQuotationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createQuotation(dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('quotation:update')
  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update draft quotation (recomputes pricing from items)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuotationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateQuotation(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('quotation:delete')
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete quotation' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('quotation:update')
  @Post(':id/send')
  @HttpCode(200)
  @AuditEvent('quotation:sent')
  @ApiOperation({ summary: 'Send quotation to customer' })
  async send(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.sendQuotation(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('quotation:approve')
  @Post(':id/approve')
  @HttpCode(200)
  @AuditEvent('quotation:approved')
  @ApiOperation({ summary: 'Approve quotation (internal approval gate)' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveQuotationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.approveQuotation(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('quotation:update')
  @Post(':id/revise')
  @HttpCode(200)
  @AuditEvent('quotation:revised')
  @ApiOperation({ summary: 'Create a revised quotation (bumps revision number)' })
  async revise(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviseQuotationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.reviseQuotation(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('quotation:update')
  @Post(':id/accept')
  @HttpCode(200)
  @AuditEvent('quotation:accepted')
  @ApiOperation({ summary: 'Accept quotation and create project' })
  async accept(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcceptQuotationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.acceptanceService.acceptAndCreateProject(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('quotation:update')
  @Post(':id/reject')
  @HttpCode(200)
  @AuditEvent('quotation:rejected')
  @ApiOperation({ summary: 'Reject quotation' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectQuotationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.rejectQuotation(id, dto, user.id, user.tenantId);
  }
}
