import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
  HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { PaymentService } from '../services/payment.service';
import { CreatePaymentDto, VerifyPaymentDto, PaymentFilterDto } from '../dto/payment.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuditEvent } from '@common/decorators/audit-event.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';

@ApiTags('commercial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commercial/payments')
export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  @Get()
  @ApiOperation({ summary: 'List payments (paginated, filterable)' })
  async findAll(
    @Query() q: PaginationDto,
    @Query() filters: PaymentFilterDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAllFiltered(user.tenantId, q.page, q.limit, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment with its invoice' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findOneWithInvoice(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('payment:create')
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Record a payment and allocate it to the invoice' })
  async create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.recordPayment(dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('payment:verify')
  @Post(':id/verify')
  @HttpCode(200)
  @AuditEvent('payment:verified')
  @ApiOperation({ summary: 'Verify a recorded payment' })
  async verify(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.verifyPayment(id, dto, user.id, user.tenantId);
  }
}
