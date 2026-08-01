import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
  HttpCode, ParseUUIDPipe, Res, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { CustomerService } from '../services/customer.service';
import { CustomerImportService } from '../services/customer-import.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerFilterDto } from '../dto/customer.dto';
import { CreateContactDto, UpdateContactDto } from '../dto/contact.dto';
import { CreateCustomerAddressDto } from '../dto/customer-address.dto';
import { CreateCustomerNoteDto, UpdateCustomerNoteDto } from '../dto/customer-note.dto';
import { CreateCustomerActivityDto } from '../dto/customer-activity.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuditEvent } from '@common/decorators/audit-event.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { MinioService } from '../../storage/minio.service';

@ApiTags('commercial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commercial/customers')
export class CustomerController {
  constructor(
    private readonly service: CustomerService,
    private readonly importService: CustomerImportService,
    private readonly minio: MinioService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List customers (paginated, filterable, searchable)' })
  async findAll(
    @Query() q: PaginationDto,
    @Query() filters: CustomerFilterDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAllWithFilters(user.tenantId, q.page, q.limit, q.search, filters);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export customers as CSV (import-ready structure)' })
  async exportCsv(
    @Res() res: Response,
    @CurrentUser() user: AuthUser,
  ) {
    const { data } = await this.service.findAllWithFilters(user.tenantId, 1, 10000);
    const csv = this.importService.exportCsv(data);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
    res.send(csv);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer with contacts, addresses, notes, attachments, activities' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findOneWithDetails(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('customer:create')
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create customer (optionally with contacts, addresses, notes)' })
  async create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createWithDetails(dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('customer:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update customer (replaces contacts/addresses/notes when provided)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateCustomer(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('customer:delete')
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete customer' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('customer:update')
  @Post(':id/deactivate')
  @HttpCode(200)
  @AuditEvent('customer:deactivated')
  @ApiOperation({ summary: 'Deactivate customer' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.deactivate(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('customer:update')
  @Post(':id/activate')
  @HttpCode(200)
  @AuditEvent('customer:activated')
  @ApiOperation({ summary: 'Activate a deactivated customer' })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.activate(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('customer:update')
  @Post(':id/archive')
  @HttpCode(200)
  @AuditEvent('customer:archived')
  @ApiOperation({ summary: 'Archive customer (removed from default listings)' })
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.archive(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('customer:update')
  @Post(':id/restore')
  @HttpCode(200)
  @AuditEvent('customer:restored')
  @ApiOperation({ summary: 'Restore an archived customer' })
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.restore(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('customer:create')
  @Post('import')
  @HttpCode(201)
  @ApiOperation({ summary: 'Bulk import customers (array of create payloads)' })
  async importCustomers(
    @Body() dto: { items: CreateCustomerDto[] },
    @CurrentUser() user: AuthUser,
  ) {
    return this.importService.importCustomers(dto.items ?? [], user.id, user.tenantId);
  }

  // ── Contacts ──────────────────────────────────────────────────────────────
  @Get(':id/contacts')
  @ApiOperation({ summary: 'List contacts for a customer' })
  async findContacts(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findContacts(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('contact:create')
  @Post(':id/contacts')
  @HttpCode(201)
  @ApiOperation({ summary: 'Add contact to customer' })
  async addContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateContactDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.addContact(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('contact:update')
  @Patch(':id/contacts/:contactId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update a customer contact' })
  async updateContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: UpdateContactDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateContact(id, contactId, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('contact:update')
  @Post(':id/contacts/:contactId/default')
  @HttpCode(200)
  @ApiOperation({ summary: 'Set a contact as the primary/default contact' })
  async setPrimaryContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.setPrimaryContact(id, contactId, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('contact:delete')
  @Delete(':id/contacts/:contactId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove contact from customer' })
  async removeContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeContact(contactId, id, user.tenantId);
  }

  // ── Addresses ─────────────────────────────────────────────────────────────
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('customer:update')
  @Post(':id/addresses')
  @HttpCode(201)
  @ApiOperation({ summary: 'Add address to customer' })
  async addAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCustomerAddressDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.addAddress(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('customer:update')
  @Delete(':id/addresses/:addressId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove address from customer' })
  async removeAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeAddress(id, addressId, user.tenantId);
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('customer:update')
  @Post(':id/notes')
  @HttpCode(201)
  @ApiOperation({ summary: 'Add note to customer' })
  async addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCustomerNoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.addNote(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('customer:update')
  @Patch(':id/notes/:noteId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update a customer note' })
  async updateNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body() dto: UpdateCustomerNoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateNote(id, noteId, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('customer:update')
  @Delete(':id/notes/:noteId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a customer note' })
  async removeNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeNote(id, noteId, user.tenantId);
  }

  // ── Attachments ───────────────────────────────────────────────────────────
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('customer:update')
  @Post(':id/attachments')
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an attachment for a customer (multipart)' })
  async uploadAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) return { error: 'file is required' };
    const upload = await this.minio.uploadFile(
      file.buffer, file.originalname, file.mimetype, 'mitra-customer', `customers/${id}`,
    );
    const presigned = await this.minio.generatePresignedGetUrl(upload.bucket, upload.key, 86400);
    return this.service.addAttachment(id, {
      fileName: upload.originalName,
      fileType: upload.contentType,
      fileKey: upload.key,
      fileUrl: presigned.url,
      sizeBytes: upload.sizeBytes,
      checksumSha256: upload.checksumSha256,
    }, user.id, user.tenantId);
  }

  @Get(':id/attachments')
  @ApiOperation({ summary: 'List attachments for a customer' })
  async findAttachments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAttachments(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('customer:update')
  @Delete(':id/attachments/:attachmentId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove an attachment reference' })
  async removeAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeAttachment(id, attachmentId, user.tenantId);
  }

  // ── Activity timeline ─────────────────────────────────────────────────────
  @Get(':id/activities')
  @ApiOperation({ summary: 'Get customer activity timeline' })
  async findActivities(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findActivities(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Permissions('customer:update')
  @Post(':id/activities')
  @HttpCode(201)
  @ApiOperation({ summary: 'Manually record an activity on the customer timeline' })
  async addActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCustomerActivityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.addActivity(id, dto, user.id, user.tenantId);
  }
}
