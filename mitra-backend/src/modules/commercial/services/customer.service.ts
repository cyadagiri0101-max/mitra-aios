import {
  Injectable, ConflictException, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Like } from 'typeorm';
import { Customer, CustomerStatus } from '../entities/customer.entity';
import { Contact } from '../entities/contact.entity';
import { CustomerAddress } from '../entities/customer-address.entity';
import { CustomerNote } from '../entities/customer-note.entity';
import { CustomerAttachment } from '../entities/customer-attachment.entity';
import { CustomerActivityType } from '../entities/customer-activity.entity';
import { CommercialEventType } from '../events/commercial.events';
import { CreateCustomerDto, UpdateCustomerDto, CustomerFilterDto } from '../dto/customer.dto';
import { CreateContactDto, UpdateContactDto } from '../dto/contact.dto';
import { CreateCustomerAddressDto } from '../dto/customer-address.dto';
import { CreateCustomerNoteDto, UpdateCustomerNoteDto } from '../dto/customer-note.dto';
import { CreateCustomerActivityDto } from '../dto/customer-activity.dto';
import { CreateCustomerAttachmentDto } from '../dto/customer-attachment.dto';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { AuditService } from '../../audit/services/audit.service';
import { CommercialAiService } from './commercial-ai.service';
import { CommercialEventPublisherService } from './commercial-event-publisher.service';
import { CustomerCreatedEvent, CustomerUpdatedEvent } from '../events/commercial.events';
import { CustomerContactService } from './customer-contact.service';
import { CustomerAddressService } from './customer-address.service';
import { CustomerNoteService } from './customer-note.service';
import { CustomerActivityService } from './customer-activity.service';

@Injectable()
export class CustomerService extends TenantAwareService<Customer> {
  constructor(
    @InjectRepository(Customer)
    repo: Repository<Customer>,
    @InjectRepository(CustomerAttachment)
    private readonly attachmentRepo: Repository<CustomerAttachment>,
    private readonly auditService: AuditService,
    private readonly aiService: CommercialAiService,
    private readonly events: CommercialEventPublisherService,
    private readonly contactService: CustomerContactService,
    private readonly addressService: CustomerAddressService,
    private readonly noteService: CustomerNoteService,
    private readonly activityService: CustomerActivityService,
  ) {
    super(repo, 'Customer');
  }

  // ── Numbering ─────────────────────────────────────────────────────────────
  async generateCustomerCode(tenantId?: string | null): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CUS-${year}-`;
    const where: any = { code: Like(`${prefix}%`), deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const count = await this.repo.count({ where });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  // ── Create ────────────────────────────────────────────────────────────────
  async createWithDetails(
    dto: CreateCustomerDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Customer> {
    const { contacts, addresses, notes, ...customerData } = dto;
    const code = await this.generateCustomerCode(tenantId);

    const entity = this.repo.create({
      ...customerData,
      code,
      ...(tenantId ? { tenantId } : {}),
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as unknown as Customer);

    const saved = await this.repo.save(entity);

    if (contacts && contacts.length > 0) {
      await this.contactService.createContacts(saved.id, contacts, userId, tenantId);
    }
    if (addresses && addresses.length > 0) {
      await this.addressService.createAddresses(saved.id, addresses, userId, tenantId);
    }
    if (notes && notes.length > 0) {
      await this.noteService.createNotes(saved.id, notes, userId, tenantId);
    }

    await this.activityService.logActivity(saved.id, CustomerActivityType.CREATED, 'Customer created', userId, tenantId, { code });
    await this.auditService.logBusinessEvent(
      'customer.created', 'Customer', saved.id, userId ?? 'system', 
      { customerCode: code, customerName: saved.name, tenantId },
    );
    await this.aiService.syncEntityContext('customer', saved.id, {
      name: saved.name,
      industry: saved.industry,
      customerTypeId: saved.customerTypeId,
      categoryId: saved.categoryId,
      gstNumber: saved.gstNumber,
      status: saved.status,
    }, userId, tenantId);

    await this.events.publish({
      eventType: CommercialEventType.CUSTOMER_CREATED,
      timestamp: new Date(),
      tenantId: tenantId ?? null,
      actorId: userId ?? null,
      payload: { customerId: saved.id, name: saved.name, industry: saved.industry ?? null },
    } as CustomerCreatedEvent);

    return this.findOneWithDetails(saved.id, tenantId);
  }

  // ── Read ──────────────────────────────────────────────────────────────────
  async findAllWithFilters(
    tenantId?: string | null,
    page = 1,
    limit = 20,
    search?: string,
    filters: CustomerFilterDto = {},
  ) {
    const qb = this.repo.createQueryBuilder('c')
      .leftJoinAndSelect('c.contacts', 'contacts')
      .where('c.deletedAt IS NULL')
      .orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (tenantId) qb.andWhere('c.tenantId = :tenantId', { tenantId });
    if (filters.status) qb.andWhere('c.status = :status', { status: filters.status });
    if (filters.customerTypeId) qb.andWhere('c.customerTypeId = :customerTypeId', { customerTypeId: filters.customerTypeId });
    if (filters.categoryId) qb.andWhere('c.categoryId = :categoryId', { categoryId: filters.categoryId });
    if (filters.industry) qb.andWhere('c.industry ILIKE :industry', { industry: `%${filters.industry}%` });
    if (filters.includeArchived !== 'true') qb.andWhere('c.archivedAt IS NULL');
    if (search) {
      qb.andWhere(
        '(c.name ILIKE :search OR c.code ILIKE :search OR c.email ILIKE :search OR c.phone ILIKE :search OR c.gstNumber ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAllWithContacts(tenantId?: string | null, page = 1, limit = 20) {
    return this.findAllWithFilters(tenantId, page, limit);
  }

  async findOneWithDetails(id: string, tenantId?: string | null) {
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;

    const customer = await this.repo.findOne({
      where,
      relations: ['contacts', 'addresses', 'notes', 'attachments'],
      order: { contacts: { isPrimary: 'DESC' } } as any,
    });
    if (!customer) throw new NotFoundException('Customer not found');
    const activities = await this.activityService.findActivities(id, tenantId);
    (customer as unknown as Record<string, unknown>)['activities'] = activities;
    return customer;
  }

  async findOneWithContacts(id: string, tenantId?: string | null) {
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const customer = await this.repo.findOne({ where, relations: ['contacts'] });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  // ── Update ────────────────────────────────────────────────────────────────
  async updateCustomer(
    id: string,
    dto: UpdateCustomerDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Customer> {
    const entity = await this.findOneWithDetails(id, tenantId);
    const { contacts, addresses, notes, ...customerData } = dto as unknown as Record<string, unknown>;
    const allowed = this.extractAllowedFields(customerData);
    Object.assign(entity, allowed, userId ? { updatedBy: userId } : {});

    if (contacts !== undefined) {
      const contactDtos = contacts as CreateContactDto[];
      await this.contactService.replaceContacts(id, contactDtos, userId, tenantId);
      // M-1 fix: the in-memory `contacts` relation still holds the
      // soft-deleted children. If left attached, cascade save would rewrite
      // their deleted_at to NULL — silently resurrecting deleted records.
      // Detach the collection; children are managed explicitly above.
      entity.contacts = [];
    }
    if (addresses !== undefined) {
      await this.addressService.replaceAddresses(id, addresses as CreateCustomerAddressDto[], userId, tenantId);
      entity.addresses = [];
    }
    if (notes !== undefined) {
      await this.noteService.replaceNotes(id, notes as CreateCustomerNoteDto[], userId, tenantId);
      entity.notes = [];
    }

    const saved = await this.repo.save(entity);
    await this.activityService.logActivity(id, CustomerActivityType.UPDATED, 'Customer details updated', userId, tenantId);
    await this.auditService.logBusinessEvent(
      'customer.updated', 'Customer', id, userId ?? 'system', 
      { fields: Object.keys(allowed), tenantId },
    );
    await this.aiService.syncEntityContext('customer', id, {
      name: saved.name,
      industry: saved.industry,
      status: saved.status,
    }, userId, tenantId);

    await this.events.publish({
      eventType: CommercialEventType.CUSTOMER_UPDATED,
      timestamp: new Date(),
      tenantId: tenantId ?? null,
      actorId: userId ?? null,
      payload: { customerId: id, changes: allowed },
    } as CustomerUpdatedEvent);

    return this.findOneWithDetails(id, tenantId);
  }

  // ── Status operations ─────────────────────────────────────────────────────
  async deactivate(id: string, userId?: string, tenantId?: string | null): Promise<Customer> {
    const entity = await this.findOne(id, tenantId);
    if (entity.status === CustomerStatus.INACTIVE) {
      throw new BadRequestException('Customer is already inactive');
    }
    entity.status = CustomerStatus.INACTIVE;
    entity.updatedBy = userId ?? null;

    const saved = await this.repo.save(entity);
    await this.activityService.logActivity(id, CustomerActivityType.STATUS_CHANGED, 'Customer deactivated', userId, tenantId, { status: CustomerStatus.INACTIVE });
    await this.auditService.logBusinessEvent('customer.deactivated', 'Customer', id, userId ?? 'system',  { tenantId });
    return saved;
  }

  async activate(id: string, userId?: string, tenantId?: string | null): Promise<Customer> {
    const entity = await this.findOne(id, tenantId);
    if (entity.status === CustomerStatus.ACTIVE) {
      throw new BadRequestException('Customer is already active');
    }
    entity.status = CustomerStatus.ACTIVE;
    entity.updatedBy = userId ?? null;

    const saved = await this.repo.save(entity);
    await this.activityService.logActivity(id, CustomerActivityType.STATUS_CHANGED, 'Customer activated', userId, tenantId, { status: CustomerStatus.ACTIVE });
    await this.auditService.logBusinessEvent('customer.activated', 'Customer', id, userId ?? 'system',  { tenantId });
    return saved;
  }

  async archive(id: string, userId?: string, tenantId?: string | null): Promise<Customer> {
    const entity = await this.findOne(id, tenantId);
    if (entity.archivedAt) {
      throw new BadRequestException('Customer is already archived');
    }
    entity.archivedAt = new Date();
    entity.archivedBy = userId ?? null;
    entity.updatedBy = userId ?? null;

    const saved = await this.repo.save(entity);
    await this.activityService.logActivity(id, CustomerActivityType.ARCHIVED, 'Customer archived', userId, tenantId);
    await this.auditService.logBusinessEvent('customer.archived', 'Customer', id, userId ?? 'system',  { tenantId });
    return saved;
  }

  async restore(id: string, userId?: string, tenantId?: string | null): Promise<Customer> {
    const entity = await this.findOne(id, tenantId);
    if (!entity.archivedAt) {
      throw new BadRequestException('Customer is not archived');
    }
    entity.archivedAt = null;
    entity.archivedBy = null;
    entity.updatedBy = userId ?? null;

    const saved = await this.repo.save(entity);
    await this.activityService.logActivity(id, CustomerActivityType.RESTORED, 'Customer restored from archive', userId, tenantId);
    await this.auditService.logBusinessEvent('customer.restored', 'Customer', id, userId ?? 'system',  { tenantId });
    return saved;
  }

  // ── Attachments ───────────────────────────────────────────────────────────
  async addAttachment(
    customerId: string,
    dto: CreateCustomerAttachmentDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<CustomerAttachment> {
    await this.findOne(customerId, tenantId);
    const attachment = this.attachmentRepo.create({
      customerId,
      fileName: dto.fileName,
      fileType: dto.fileType ?? null,
      fileKey: dto.fileKey,
      fileUrl: dto.fileUrl ?? null,
      sizeBytes: dto.sizeBytes != null ? String(dto.sizeBytes) : null,
      checksumSha256: dto.checksumSha256 ?? null,
      ...(tenantId ? { tenantId } : {}),
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as unknown as CustomerAttachment);
    const saved = await this.attachmentRepo.save(attachment);
    await this.activityService.logActivity(customerId, CustomerActivityType.ATTACHMENT_ADDED, `Attachment added: ${saved.fileName}`, userId, tenantId, { attachmentId: saved.id });
    return saved;
  }

  async findAttachments(customerId: string, tenantId?: string | null) {
    await this.findOne(customerId, tenantId);
    return this.attachmentRepo.find({
      where: { customerId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async removeAttachment(customerId: string, attachmentId: string, tenantId?: string | null) {
    await this.findOne(customerId, tenantId);
    const attachment = await this.attachmentRepo.findOne({
      where: { id: attachmentId, customerId, deletedAt: IsNull() },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    attachment.deletedAt = new Date();
    await this.attachmentRepo.save(attachment);
    return { deleted: true, id: attachmentId };
  }

  // ── Delegates: contacts / addresses / notes / activities ──────────────────
  async addContact(
    customerId: string,
    dto: CreateContactDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Contact> {
    return this.contactService.addContact(customerId, dto, userId, tenantId);
  }

  async updateContact(
    customerId: string,
    contactId: string,
    dto: UpdateContactDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Contact> {
    return this.contactService.updateContact(customerId, contactId, dto, userId, tenantId);
  }

  async setPrimaryContact(customerId: string, contactId: string, userId?: string, tenantId?: string | null): Promise<Contact> {
    return this.contactService.setPrimaryContact(customerId, contactId, userId, tenantId);
  }

  async findContacts(customerId: string, tenantId?: string | null) {
    return this.contactService.findContacts(customerId, tenantId);
  }

  async removeContact(contactId: string, customerId: string, tenantId?: string | null) {
    return this.contactService.removeContact(contactId, customerId, tenantId);
  }

  async addAddress(
    customerId: string,
    dto: CreateCustomerAddressDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<CustomerAddress> {
    return this.addressService.addAddress(customerId, dto, userId, tenantId);
  }

  async removeAddress(customerId: string, addressId: string, tenantId?: string | null) {
    return this.addressService.removeAddress(customerId, addressId, tenantId);
  }

  async addNote(
    customerId: string,
    dto: CreateCustomerNoteDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<CustomerNote> {
    return this.noteService.addNote(customerId, dto, userId, tenantId);
  }

  async updateNote(
    customerId: string,
    noteId: string,
    dto: UpdateCustomerNoteDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<CustomerNote> {
    return this.noteService.updateNote(customerId, noteId, dto, userId, tenantId);
  }

  async removeNote(customerId: string, noteId: string, tenantId?: string | null) {
    return this.noteService.removeNote(customerId, noteId, tenantId);
  }

  async addActivity(customerId: string, dto: CreateCustomerActivityDto, userId?: string, tenantId?: string | null) {
    return this.activityService.addActivity(customerId, dto, userId, tenantId);
  }

  async findActivities(customerId: string, tenantId?: string | null) {
    return this.activityService.findActivities(customerId, tenantId);
  }
}
