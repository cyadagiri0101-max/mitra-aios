import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
  HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { CreditNoteService } from '../services/credit-note.service';
import {
  CreateCreditNoteDto, ApplyCreditNoteDto, CancelCreditNoteDto, CreditNoteFilterDto,
} from '../dto/credit-note.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuditEvent } from '@common/decorators/audit-event.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';

@ApiTags('commercial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commercial/credit-notes')
export class CreditNoteController {
  constructor(private readonly service: CreditNoteService) {}

  @Get()
  @ApiOperation({ summary: 'List credit notes (paginated, filterable)' })
  async findAll(
    @Query() q: PaginationDto,
    @Query() filters: CreditNoteFilterDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAllFiltered(user.tenantId, q.page, q.limit, q.search, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a credit note' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findOne(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('creditNote:create')
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a credit note (OPEN)' })
  async create(
    @Body() dto: CreateCreditNoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createCreditNote(dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('creditNote:apply')
  @Post(':id/apply')
  @HttpCode(200)
  @AuditEvent('credit-note:applied')
  @ApiOperation({ summary: 'Apply an OPEN credit note to an invoice' })
  async apply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplyCreditNoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.applyCreditNote(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('creditNote:cancel')
  @Post(':id/cancel')
  @HttpCode(200)
  @AuditEvent('credit-note:cancelled')
  @ApiOperation({ summary: 'Cancel an OPEN credit note (reason required)' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelCreditNoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.cancelCreditNote(id, dto, user.id, user.tenantId);
  }
}
