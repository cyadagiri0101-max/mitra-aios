import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
  HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { RfqService, WorkflowActorContext } from '../services/rfq.service';
import {
  CreateRfqDto, UpdateRfqDto, RfqFilterDto, ExecuteRfqTransitionDto, CreateRfqRevisionDto,
} from '../dto/rfq.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuditEvent } from '@common/decorators/audit-event.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';

@ApiTags('commercial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commercial/rfqs')
export class RfqController {
  constructor(private readonly service: RfqService) {}

  private actor(user: AuthUser): WorkflowActorContext {
    return {
      userId: user.id,
      userRole: user.role,
      userPermissions: user.permissions ?? [],
      tenantId: user.tenantId ?? undefined,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List RFQs (paginated, filter by workflow state/status/priority/customer)' })
  async findAll(
    @Query() q: PaginationDto,
    @Query() filters: RfqFilterDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAllFiltered(user.tenantId, q.page, q.limit, q.search, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get RFQ with products, revisions, workflow history, quotations' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findOneWithDetails(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('rfq:create')
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create RFQ (starts configurable workflow at DRAFT)' })
  async create(
    @Body() dto: CreateRfqDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createRfq(dto, this.actor(user));
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('rfq:update')
  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update RFQ (material changes create revision history)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRfqDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateRfq(id, dto, this.actor(user));
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('rfq:delete')
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete RFQ' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('rfq:transition')
  @Post(':id/transition')
  @HttpCode(200)
  @AuditEvent('rfq:transition')
  @ApiOperation({ summary: 'Execute a configurable workflow transition' })
  async transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExecuteRfqTransitionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.executeTransition(id, dto, this.actor(user));
  }

  @Get(':id/transitions')
  @ApiOperation({ summary: 'List available transitions for the current RFQ state' })
  async availableTransitions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getAvailableTransitions(id, this.actor(user));
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('rfq:update')
  @Post(':id/revisions')
  @HttpCode(201)
  @AuditEvent('rfq:revised')
  @ApiOperation({ summary: 'Create a manual RFQ revision (version history)' })
  async createRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRfqRevisionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createRevision(id, dto, user.id, user.tenantId);
  }

  @Get(':id/revisions')
  @ApiOperation({ summary: 'List RFQ revision history' })
  async findRevisions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findRevisions(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('rfq:update')
  @Post(':id/products')
  @HttpCode(201)
  @ApiOperation({ summary: 'Add a product line to the RFQ' })
  async addProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: NonNullable<CreateRfqDto['products']>[number],
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.addProduct(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('rfq:update')
  @Delete(':id/products/:productId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a product line from the RFQ' })
  async removeProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeProduct(id, productId, user.tenantId);
  }
}
