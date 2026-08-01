import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
  HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { ContactService } from '../services/contact.service';
import { StandaloneCreateContactDto, UpdateContactDto } from '../dto/contact.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuditEvent } from '@common/decorators/audit-event.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';

@ApiTags('commercial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commercial/contacts')
export class ContactController {
  constructor(private readonly service: ContactService) {}

  @Get()
  @ApiOperation({ summary: 'List contacts (paginated, filter by customer/designation/department)' })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query() q: PaginationDto,
    @Query('customerId') customerId?: string,
    @Query('designation') designation?: string,
    @Query('department') department?: string,
  ) {
    return this.service.findAllFiltered(
      user.tenantId, q.page, q.limit, q.search, customerId, designation, department,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findById(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('contact:create')
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create contact for a customer' })
  async create(
    @Body() dto: StandaloneCreateContactDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createContact(dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('contact:update')
  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update contact' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateContact(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('contact:update')
  @Post(':id/default')
  @HttpCode(200)
  @AuditEvent('contact:set-default')
  @ApiOperation({ summary: 'Mark contact as the default/primary contact' })
  async setDefault(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.setDefault(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('contact:delete')
  @Delete(':id')
  @HttpCode(204)
  @AuditEvent('contact:deleted')
  @ApiOperation({ summary: 'Soft-delete contact' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeContact(id, user.id, user.tenantId);
  }
}
