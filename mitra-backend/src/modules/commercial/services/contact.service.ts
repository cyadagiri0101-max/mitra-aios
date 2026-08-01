import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Contact } from '../entities/contact.entity';
import { Customer } from '../entities/customer.entity';
import { StandaloneCreateContactDto, UpdateContactDto } from '../dto/contact.dto';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { AuditService } from '../../audit/services/audit.service';

@Injectable()
export class ContactService extends TenantAwareService<Contact> {
  constructor(
    @InjectRepository(Contact)
    repo: Repository<Contact>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly auditService: AuditService,
  ) {
    super(repo, 'Contact');
  }

  async findAllFiltered(
    tenantId?: string | null,
    page = 1,
    limit = 20,
    search?: string,
    customerId?: string,
    designation?: string,
    department?: string,
  ) {
    const qb = this.repo.createQueryBuilder('ct')
      .where('ct.deletedAt IS NULL')
      .orderBy('ct.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (tenantId) qb.andWhere('ct.tenantId = :tenantId', { tenantId });
    if (customerId) qb.andWhere('ct.customerId = :customerId', { customerId });
    if (designation) qb.andWhere('ct.designation = :designation', { designation });
    if (department) qb.andWhere('ct.department = :department', { department });
    if (search) {
      qb.andWhere(
        '(ct.firstName ILIKE :search OR ct.lastName ILIKE :search OR ct.email ILIKE :search OR ct.phone ILIKE :search OR ct.mobile ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createContact(
    dto: StandaloneCreateContactDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Contact> {
    if (!dto.customerId) {
      throw new BadRequestException('customerId is required');
    }
    const customer = await this.customerRepo.findOne({
      where: { id: dto.customerId, deletedAt: IsNull() },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    if (dto.isPrimary) {
      await this.repo.update(
        { customerId: dto.customerId, isPrimary: true, deletedAt: IsNull() },
        { isPrimary: false },
      );
    }

    const contact = this.repo.create({
      customerId: dto.customerId,
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
    const saved = await this.repo.save(contact);

    if (saved.isPrimary) {
      await this.customerRepo.update({ id: dto.customerId }, { primaryContactId: saved.id });
    }
    await this.auditService.logBusinessEvent(
      'contact.created', 'Contact', saved.id, userId ?? 'system', 
      { customerId: dto.customerId, tenantId },
    );
    return saved;
  }

  async updateContact(
    id: string,
    dto: UpdateContactDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Contact> {
    const contact = await this.findOne(id, tenantId);
    const { customerId, ...fields } = dto as unknown as Record<string, unknown>;

    const makePrimary = fields.isPrimary as boolean | undefined;
    if (makePrimary) {
      await this.repo.update(
        { customerId: contact.customerId, isPrimary: true, deletedAt: IsNull() },
        { isPrimary: false },
      );
    }

    const allowed = this.extractAllowedFields(fields);
    Object.assign(contact, allowed, userId ? { updatedBy: userId } : {});
    const saved = await this.repo.save(contact);

    if (saved.isPrimary) {
      await this.customerRepo.update({ id: saved.customerId }, { primaryContactId: saved.id });
    }
    await this.auditService.logBusinessEvent(
      'contact.updated', 'Contact', saved.id, userId ?? 'system', 
      { customerId: saved.customerId, tenantId },
    );
    return saved;
  }

  async setDefault(id: string, userId?: string, tenantId?: string | null): Promise<Contact> {
    const contact = await this.findOne(id, tenantId);
    await this.repo.update(
      { customerId: contact.customerId, isPrimary: true, deletedAt: IsNull() },
      { isPrimary: false },
    );
    contact.isPrimary = true;

    contact.updatedBy = userId ?? null;
    const saved = await this.repo.save(contact);
    await this.customerRepo.update({ id: saved.customerId }, { primaryContactId: saved.id });
    await this.auditService.logBusinessEvent(
      'contact.set-default', 'Contact', saved.id, userId ?? 'system', 
      { customerId: saved.customerId, tenantId },
    );
    return saved;
  }

  async removeContact(id: string, userId?: string, tenantId?: string | null): Promise<{ deleted: true; id: string }> {
    const contact = await this.findOne(id, tenantId);
    contact.deletedAt = new Date();
    contact.updatedBy = userId ?? null;
    await this.repo.save(contact);
    if (contact.isPrimary) {
      await this.customerRepo.update({ id: contact.customerId }, { primaryContactId: null });
    }
    await this.auditService.logBusinessEvent(
      'contact.deleted', 'Contact', id, userId ?? 'system', 
      { customerId: contact.customerId, tenantId },
    );
    return { deleted: true, id };
  }

  findById(id: string, tenantId?: string | null) {
    return this.findOne(id, tenantId);
  }
}
