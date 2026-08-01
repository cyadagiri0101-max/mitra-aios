import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Like } from 'typeorm';
import { Lead, LeadStatus, Priority } from '../entities/lead.entity';
import { Customer, CustomerStatus, CustomerSource } from '../entities/customer.entity';
import { Contact } from '../entities/contact.entity';
import { CreateLeadDto, UpdateLeadDto, ConvertLeadDto, LeadFilterDto } from '../dto/lead.dto';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { AuditService } from '../../audit/services/audit.service';
import { CommercialAiService } from './commercial-ai.service';

@Injectable()
export class LeadService extends TenantAwareService<Lead> {
  constructor(
    @InjectRepository(Lead)
    repo: Repository<Lead>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    private readonly auditService: AuditService,
    private readonly aiService: CommercialAiService,
  ) {
    super(repo, 'Lead');
  }

  private async generateLeadNumber(tenantId?: string | null, attempt = 0): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `LEAD-${year}-`;
    const where: any = { leadNumber: Like(`${prefix}%`), deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const count = await this.repo.count({ where });
    return `${prefix}${String(count + 1 + attempt).padStart(4, '0')}`;
  }

  async createLead(
    dto: CreateLeadDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Lead> {
    if (dto.customerId) {
      const customer = await this.customerRepo.findOne({
        where: { id: dto.customerId, deletedAt: IsNull() },
      });
      if (!customer) throw new NotFoundException('Customer not found');
    }

    let saved: Lead | undefined;
    let lastErr: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      const leadNumber = await this.generateLeadNumber(tenantId, attempt);
      const entity = this.repo.create({
        ...dto,
        leadNumber,
        leadStatus: dto.leadStatus ?? LeadStatus.NEW,
        priority: dto.priority ?? Priority.MEDIUM,
        probability: dto.probability ?? 10,
        ...(tenantId ? { tenantId } : {}),
        ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
      } as unknown as Lead);
      try {
        saved = await this.repo.save(entity);
        break;
      } catch (err: any) {
        if (err?.code !== '23505') throw err;
        lastErr = err;
      }
    }
    if (!saved) throw lastErr;

    await this.auditService.logBusinessEvent(
      'lead.created', 'Lead', saved.id, userId ?? 'system', 
      { leadNumber: saved.leadNumber, customerName: saved.customerName, tenantId },
    );
    await this.aiService.syncEntityContext('lead', saved.id, {
      leadNumber: saved.leadNumber,
      customerName: saved.customerName,
      leadSource: saved.leadSource,
      leadStatus: saved.leadStatus,
      priority: saved.priority,
      expectedRevenue: saved.expectedRevenue,
      probability: saved.probability,
    }, userId, tenantId);
    return saved;
  }

  async findAllFiltered(
    tenantId?: string | null,
    page = 1,
    limit = 20,
    search?: string,
    filters: LeadFilterDto = {},
  ) {
    const qb = this.repo.createQueryBuilder('l')
      .where('l.deletedAt IS NULL')
      .orderBy('l.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (tenantId) qb.andWhere('l.tenantId = :tenantId', { tenantId });
    if (filters.leadSource) qb.andWhere('l.leadSource = :leadSource', { leadSource: filters.leadSource });
    if (filters.leadStatus) qb.andWhere('l.leadStatus = :leadStatus', { leadStatus: filters.leadStatus });
    if (filters.priority) qb.andWhere('l.priority = :priority', { priority: filters.priority });
    if (filters.ownerId) qb.andWhere('l.ownerId = :ownerId', { ownerId: filters.ownerId });
    if (search) {
      qb.andWhere(
        '(l.leadNumber ILIKE :search OR l.customerName ILIKE :search OR l.notes ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateLead(
    id: string,
    dto: UpdateLeadDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Lead> {
    const lead = await this.findOne(id, tenantId);
    const allowed = this.extractAllowedFields(dto as unknown as Record<string, unknown>);

    if (allowed.customerId) {
      const customer = await this.customerRepo.findOne({
        where: { id: allowed.customerId as string, deletedAt: IsNull() },
      });
      if (!customer) throw new NotFoundException('Customer not found');
    }

    Object.assign(lead, allowed, userId ? { updatedBy: userId } : {});
    const saved = await this.repo.save(lead);

    await this.auditService.logBusinessEvent(
      'lead.updated', 'Lead', saved.id, userId ?? 'system', 
      { leadNumber: saved.leadNumber, fields: Object.keys(allowed), tenantId },
    );
    return saved;
  }

  async convert(
    id: string,
    dto: ConvertLeadDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<{ lead: Lead; customer: Customer }> {
    const lead = await this.findOne(id, tenantId);
    if (lead.leadStatus === LeadStatus.CONVERTED) {
      throw new BadRequestException('Lead is already converted');
    }
    if (lead.leadStatus === LeadStatus.LOST || lead.leadStatus === LeadStatus.DISQUALIFIED) {
      throw new BadRequestException(`Cannot convert a ${lead.leadStatus.toLowerCase()} lead`);
    }

    const customerName = dto.customerName ?? lead.customerName ?? 'Unknown Customer';
    const customer = await this.customerRepo.save(this.customerRepo.create({
      name: customerName,
      industry: dto.industry ?? null,
      customerTypeId: dto.customerTypeId ?? null,
      categoryId: dto.categoryId ?? null,
      gstNumber: dto.gstNumber ?? null,
      status: CustomerStatus.ACTIVE,
      source: CustomerSource.LEAD_CONVERSION,
      ...(tenantId ? { tenantId } : {}),
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as unknown as Customer));

    if (lead.contactId) {
      const contact = await this.contactRepo.findOne({
        where: { id: lead.contactId, deletedAt: IsNull() },
      });
      if (contact) {
        await this.contactRepo.update({ id: contact.id }, { customerId: customer.id });
        await this.customerRepo.update({ id: customer.id }, { primaryContactId: contact.id });
      }
    }

    lead.customerId = customer.id;
    lead.convertedCustomerId = customer.id;
    lead.convertedAt = new Date();
    lead.leadStatus = LeadStatus.CONVERTED;

    lead.updatedBy = userId ?? null;
    const savedLead = await this.repo.save(lead);

    await this.auditService.logBusinessEvent(
      'lead.converted', 'Lead', savedLead.id, userId ?? 'system', 
      { leadNumber: savedLead.leadNumber, customerId: customer.id, tenantId },
    );
    await this.aiService.syncEntityContext('lead', savedLead.id, {
      leadNumber: savedLead.leadNumber,
      leadStatus: LeadStatus.CONVERTED,
      convertedCustomerId: customer.id,
    }, userId, tenantId);

    return { lead: savedLead, customer };
  }

  async getPipelineSummary(tenantId?: string | null) {
    const where: any = { deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;

    const all = await this.repo.find({ where });
    const byStatus: Record<string, number> = {};
    let pipelineValue = 0;
    let openLeads = 0;

    for (const lead of all) {
      byStatus[lead.leadStatus] = (byStatus[lead.leadStatus] ?? 0) + 1;
      if (lead.leadStatus === LeadStatus.NEW || lead.leadStatus === LeadStatus.QUALIFIED || lead.leadStatus === LeadStatus.PROPOSAL) {
        openLeads++;
        pipelineValue += Number(lead.expectedRevenue ?? 0) * (lead.probability / 100);
      }
    }

    return {
      total: all.length,
      open: openLeads,
      byStatus,
      pipelineValue,
      converted: byStatus[LeadStatus.CONVERTED] ?? 0,
    };
  }

  async findById(id: string, tenantId?: string | null) {
    return this.findOne(id, tenantId);
  }
}
