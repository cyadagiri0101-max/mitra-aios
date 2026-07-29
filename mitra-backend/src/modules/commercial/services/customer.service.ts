import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Customer, CustomerStatus } from '../entities/customer.entity';
import { Contact } from '../entities/contact.entity';
import { CreateCustomerDto, UpdateCustomerDto } from '../dto/customer.dto';
import { CreateContactDto } from '../dto/contact.dto';
import { TenantAwareService } from '@common/services/tenant-aware.service';

@Injectable()
export class CustomerService extends TenantAwareService<Customer> {
  constructor(
    @InjectRepository(Customer)
    repo: Repository<Customer>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
  ) {
    super(repo, 'Customer');
  }

  async createWithContacts(
    dto: CreateCustomerDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Customer> {
    const { contacts, ...customerData } = dto;

    const entity = this.repo.create({
      ...customerData,
      ...(tenantId ? { tenantId } : {}),
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as unknown as Customer);

    const saved = await this.repo.save(entity);

    if (contacts && contacts.length > 0) {
      for (const c of contacts) {
        const contact = this.contactRepo.create({
          customerId: saved.id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone ?? null,
          role: c.role ?? null,
          isPrimary: c.isPrimary ?? false,
          ...(tenantId ? { tenantId } : {}),
          ...(userId ? { createdBy: userId } : {}),
        } as unknown as Contact);
        await this.contactRepo.save(contact);
      }
    }

    const customer = await this.repo.findOne({ where: { id: saved.id, deletedAt: IsNull() }, relations: ['contacts'] });
    if (!customer) throw new NotFoundException('Customer not found after creation');
    return customer;
  }

  async findAllWithContacts(tenantId?: string | null, page = 1, limit = 20) {
    const where: any = { deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['contacts'],
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneWithContacts(id: string, tenantId?: string | null) {
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;

    const customer = await this.repo.findOne({ where, relations: ['contacts'] });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async updateCustomer(
    id: string,
    dto: UpdateCustomerDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Customer> {
    const entity = await this.findOneWithContacts(id, tenantId);
    const allowed = this.extractAllowedFields(dto as unknown as Record<string, unknown>);
    Object.assign(entity, allowed, userId ? { updatedBy: userId } : {});
    return this.repo.save(entity);
  }

  async addContact(
    customerId: string,
    dto: CreateContactDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Contact> {
    await this.findOne(customerId, tenantId);

    if (dto.isPrimary) {
      await this.contactRepo.update(
        { customerId, isPrimary: true, deletedAt: IsNull() },
        { isPrimary: false },
      );
    }

    const contact = this.contactRepo.create({
      customerId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone ?? null,
      role: dto.role ?? null,
      isPrimary: dto.isPrimary ?? false,
      ...(tenantId ? { tenantId } : {}),
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as unknown as Contact);
    return this.contactRepo.save(contact);
  }

  async findContacts(customerId: string, tenantId?: string | null) {
    await this.findOne(customerId, tenantId);
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
    return this.contactRepo.save(contact);
  }
}
