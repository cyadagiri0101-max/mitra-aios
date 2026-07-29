import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Like } from 'typeorm';
import { Quotation, QuotationStatus } from '../entities/quotation.entity';
import { QuotationItem } from '../entities/quotationitem.entity';
import { Enquiry, EnquiryStatus } from '../entities/enquiry.entity';
import { CreateQuotationDto, UpdateQuotationDto, AcceptQuotationDto, RejectQuotationDto } from '../dto/quotation.dto';
import { TenantAwareService } from '@common/services/tenant-aware.service';

@Injectable()
export class QuotationService extends TenantAwareService<Quotation> {
  constructor(
    @InjectRepository(Quotation)
    repo: Repository<Quotation>,
    @InjectRepository(QuotationItem)
    private readonly itemRepo: Repository<QuotationItem>,
    @InjectRepository(Enquiry)
    private readonly enquiryRepo: Repository<Enquiry>,
  ) {
    super(repo, 'Quotation');
  }

  async createFromRfq(
    dto: CreateQuotationDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Quotation> {
    const quotationNumber = await this.generateQuotationNumber(tenantId);
    const enquiry = await this.enquiryRepo.findOne({ where: { id: dto.rfqId, deletedAt: IsNull() } });
    const customerName = dto.customerName ?? enquiry?.customerName ?? 'Unknown Customer';
    const productName = dto.productName ?? enquiry?.productName ?? null;

    const entity = this.repo.create({
      quotationNumber,
      enquiryId: dto.rfqId,
      customerId: dto.customerId,
      customerName,
      status: QuotationStatus.DRAFT,
      quotationDate: new Date(),
      validUntil: new Date(dto.validUntil),
      totalAmount: dto.amount,
      subtotal: dto.amount,
      terms: (dto.terms as any)?.payment_terms ?? null,
      deliveryWeeks: (dto.terms as any)?.delivery_weeks ?? null,
      warrantyMonths: (dto.terms as any)?.warranty_months ?? 12,
      ...(tenantId ? { tenantId } : {}),
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as unknown as Quotation);

    const saved = await this.repo.save(entity);

    // Update enquiry status to CONVERTED
    await this.enquiryRepo.update(
      { id: dto.rfqId },
      { status: EnquiryStatus.CONVERTED },
    );

    if (productName && enquiry) {
      await this.enquiryRepo.update(
        { id: dto.rfqId },
        { productName },
      );
    }

    return saved;
  }

  async sendQuotation(
    id: string,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Quotation> {
    const quotation = await this.findOne(id, tenantId);
    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException('Only draft quotations can be sent');
    }
    quotation.status = QuotationStatus.SENT;
    quotation.updatedBy = userId ?? null;
    return this.repo.save(quotation);
  }

  async acceptQuotation(
    id: string,
    dto: AcceptQuotationDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<{ quotation: Quotation; projectData: Record<string, unknown> }> {
    const quotation = await this.findOne(id, tenantId);
    if (quotation.status !== QuotationStatus.SENT) {
      throw new BadRequestException('Only sent quotations can be accepted');
    }

    quotation.status = QuotationStatus.ACCEPTED;
    quotation.approvedBy = userId ?? null;
    quotation.approvedAt = new Date();
    const saved = await this.repo.save(quotation);

    const enquiry = await this.enquiryRepo.findOne({ where: { id: quotation.enquiryId ?? '', deletedAt: IsNull() } });
    const projectData = {
      name: dto.projectName,
      customerId: quotation.customerId,
      customerName: dto.customerName ?? quotation.customerName ?? enquiry?.customerName ?? 'Unknown Customer',
      productName: dto.productName ?? enquiry?.productName ?? dto.projectName,
      description: `Project from quotation ${quotation.quotationNumber}`,
      projectValue: quotation.totalAmount,
      targetDeliveryDate: quotation.validUntil,
      quotationId: id,
    };

    return { quotation: saved, projectData };
  }

  async rejectQuotation(
    id: string,
    dto: RejectQuotationDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Quotation> {
    const quotation = await this.findOne(id, tenantId);
    if (quotation.status !== QuotationStatus.SENT) {
      throw new BadRequestException('Only sent quotations can be rejected');
    }

    quotation.status = QuotationStatus.REJECTED;
    quotation.rejectionReason = dto.reason;
    quotation.updatedBy = userId ?? null;
    return this.repo.save(quotation);
  }

  async findAllWithItems(tenantId?: string | null, page = 1, limit = 20) {
    const where: any = { deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneWithItems(id: string, tenantId?: string | null) {
    const quotation = await this.findOne(id, tenantId);
    const items = await this.itemRepo.find({
      where: { quotationId: id, deletedAt: IsNull() },
      order: { lineNumber: 'ASC' },
    });
      (quotation as any).items = items;
    return quotation;
  }

  async linkProject(id: string, projectId: string, userId?: string, tenantId?: string | null): Promise<Quotation> {
    const quotation = await this.findOne(id, tenantId);
    quotation.projectId = projectId;
    quotation.status = QuotationStatus.PROJECT_CREATED;
    quotation.updatedBy = userId ?? null;
    return this.repo.save(quotation);
  }

  private async generateQuotationNumber(tenantId?: string | null): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QTN-${year}-`;
    const where: any = { quotationNumber: Like(`${prefix}%`), deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const count = await this.repo.count({ where });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }
}
