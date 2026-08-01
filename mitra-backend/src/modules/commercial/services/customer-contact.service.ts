import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Contact } from '../entities/contact.entity';
import { Customer } from '../entities/customer.entity';
import { CustomerActivityType } from '../entities/customer-activity.entity';
import { CreateContactDto, UpdateContactDto } from '../dto/contact.dto';
import { CustomerActivityService } from './customer-activity.service';

@Injectable()
export class CustomerContactService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly activityService: CustomerActivityService,
  ) {}

  private async assertCustomerExists(customerId: string, tenantId?: string | null): Promise<void> {
    const where: any = { id: customerId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const customer = await this.customerRepo.findOne({ where });
    if (!customer) throw new NotFoundException('Customer not found');
  }

  async createContacts(
    customerId: string,
    contacts: CreateContactDto[],
    userId?: string,
    tenantId?: string | null,
  ): Promise<void> {
    for (const c of contacts) {
      const primary = c.isPrimary ?? false;
      if (primary) {
        await this.clearPrimaryContact(customerId);
      }
      const contact = await this.contactRepo.save(this.contactRepo.create({
        customerId,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email ?? null,
        phone: c.phone ?? null,
        mobile: c.mobile ?? null,
        role: c.role ?? null,
        designation: c.designation ?? null,
        department: c.department ?? null,
        communicationPreferences: c.communicationPreferences ?? null,
        isPrimary: primary,
        notes: c.notes ?? null,
        ...(tenantId ? { tenantId } : {}),
        ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
      } as unknown as Contact));
      if (primary) {
        await this.customerRepo.update({ id: customerId }, { primaryContactId: contact.id });
      }
    }
  }

  async clearPrimaryContact(customerId: string): Promise<void> {
    await this.contactRepo.update(
      { customerId, isPrimary: true, deletedAt: IsNull() },
      { isPrimary: false },
    );
  }

  async replaceContacts(
    customerId: string,
    contacts: CreateContactDto[],
    userId?: string,
    tenantId?: string | null,
  ): Promise<void> {
    await this.contactRepo.update({ customerId, deletedAt: IsNull() }, { deletedAt: new Date() });
    if (contacts.length > 0) {
      await this.createContacts(customerId, contacts, userId, tenantId);
    }
  }

  async addContact(
    customerId: string,
    dto: CreateContactDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Contact> {
    await this.assertCustomerExists(customerId, tenantId);

    if (dto.isPrimary) {
      await this.clearPrimaryContact(customerId);
    }

    const contact = this.contactRepo.create({
      customerId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      mobile: dto.mobile ?? null,
      role: dto.role ?? null,
      designation: dto.designation ?? null,
      department: dto.department ?? null,
      communicationPreferences: dto.communicationPreferences ?? null,
      isPrimary: dto.isPrimary ?? false,
      notes: dto.notes ?? null,
      ...(tenantId ? { tenantId } : {}),
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as unknown as Contact);
    const saved = await this.contactRepo.save(contact);

    if (saved.isPrimary) {
      await this.customerRepo.update({ id: customerId }, { primaryContactId: saved.id });
    }
    await this.activityService.logActivity(customerId, CustomerActivityType.CONTACT_ADDED, `Contact added: ${saved.firstName} ${saved.lastName}`, userId, tenantId);
    return saved;
  }

  async updateContact(
    customerId: string,
    contactId: string,
    dto: UpdateContactDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Contact> {
    await this.assertCustomerExists(customerId, tenantId);
    const contact = await this.contactRepo.findOne({
      where: { id: contactId, customerId, deletedAt: IsNull() },
    });
    if (!contact) throw new NotFoundException('Contact not found');

    const allowed = this.extractAllowedFields(dto as unknown as Record<string, unknown>);
    const primary = (dto as unknown as Record<string, unknown>).isPrimary as boolean | undefined;
    if (primary) {
      await this.clearPrimaryContact(customerId);
    }
    Object.assign(contact, allowed, userId ? { updatedBy: userId } : {});
    const saved = await this.contactRepo.save(contact);

    if (saved.isPrimary) {
      await this.customerRepo.update({ id: customerId }, { primaryContactId: saved.id });
    }
    await this.activityService.logActivity(customerId, CustomerActivityType.CONTACT_UPDATED, `Contact updated: ${saved.firstName} ${saved.lastName}`, userId, tenantId);
    return saved;
  }

  async setPrimaryContact(customerId: string, contactId: string, userId?: string, tenantId?: string | null): Promise<Contact> {
    await this.assertCustomerExists(customerId, tenantId);
    const contact = await this.contactRepo.findOne({
      where: { id: contactId, customerId, deletedAt: IsNull() },
    });
    if (!contact) throw new NotFoundException('Contact not found');

    await this.clearPrimaryContact(customerId);
    contact.isPrimary = true;
    contact.updatedBy = userId ?? null;

    const saved = await this.contactRepo.save(contact);
    await this.customerRepo.update({ id: customerId }, { primaryContactId: saved.id });
    await this.activityService.logActivity(customerId, CustomerActivityType.CONTACT_UPDATED, `Primary contact set: ${saved.firstName} ${saved.lastName}`, userId, tenantId);
    return saved;
  }

  async findContacts(customerId: string, tenantId?: string | null) {
    await this.assertCustomerExists(customerId, tenantId);
    return this.contactRepo.find({
      where: { customerId, deletedAt: IsNull() },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  async removeContact(contactId: string, customerId: string, tenantId?: string | null) {
    const contact = await this.contactRepo.findOne({
      where: { id: contactId, customerId, deletedAt: IsNull() },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    contact.deletedAt = new Date();
    await this.contactRepo.save(contact);
    if (contact.isPrimary) {
      const primary = await this.contactRepo.findOne({
        where: { customerId, isPrimary: true, deletedAt: IsNull() },
        order: { createdAt: 'ASC' },
      });
      if (!primary) {
        const fallback = await this.contactRepo.findOne({
          where: { customerId, deletedAt: IsNull() },
          order: { createdAt: 'ASC' },
        });
        if (fallback) {
          fallback.isPrimary = true;
          await this.contactRepo.save(fallback);
          await this.customerRepo.update({ id: customerId }, { primaryContactId: fallback.id });
        } else {
          await this.customerRepo.update({ id: customerId }, { primaryContactId: null });
        }
      }
    }
    await this.activityService.logActivity(customerId, CustomerActivityType.CONTACT_UPDATED, 'Contact removed', undefined, tenantId);
    return { deleted: true, id: contactId };
  }

  protected extractAllowedFields(data: Record<string, unknown>): Record<string, unknown> {
    const protectedFields = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy', 'tenantId'];
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (!protectedFields.includes(key)) result[key] = value;
    }
    return result;
  }
}
