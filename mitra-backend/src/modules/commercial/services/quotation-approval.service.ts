import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Quotation, QuotationStatus } from '../entities/quotation.entity';
import { Rfq } from '../entities/rfq.entity';
import { Enquiry } from '../entities/enquiry.entity';
import { ApproveQuotationDto, AcceptQuotationDto, RejectQuotationDto } from '../dto/quotation.dto';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { AuditService } from '../../audit/services/audit.service';
import { CommercialAiService } from './commercial-ai.service';

@Injectable()
export class QuotationApprovalService extends TenantAwareService<Quotation> {
  constructor(
    @InjectRepository(Quotation)
    repo: Repository<Quotation>,
    @InjectRepository(Rfq)
    private readonly rfqRepo: Repository<Rfq>,
    @InjectRepository(Enquiry)
    private readonly enquiryRepo: Repository<Enquiry>,
    private readonly auditService: AuditService,
    private readonly aiService: CommercialAiService,
  ) {
    super(repo, 'Quotation');
  }

  async approveQuotation(
    id: string,
    dto: ApproveQuotationDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Quotation> {
    const quotation = await this.findOne(id, tenantId);
    if (quotation.status !== QuotationStatus.DRAFT && quotation.status !== QuotationStatus.SENT) {
      throw new BadRequestException('Only draft or sent quotations can be approved');
    }
    quotation.status = QuotationStatus.APPROVED;
    quotation.approvedBy = userId ?? null;
    quotation.approvedAt = new Date();
    quotation.updatedBy = userId ?? null;

    const saved = await this.repo.save(quotation);
    await this.auditService.logBusinessEvent(
      'quotation.approved', 'Quotation', id, userId ?? 'system',
      { quotationNumber: saved.quotationNumber, remarks: dto.remarks ?? null, tenantId },
    );
    return saved;
  }

  async acceptQuotation(
    id: string,
    dto: AcceptQuotationDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<{ quotation: Quotation; projectData: Record<string, unknown> }> {
    const quotation = await this.findOne(id, tenantId);
    if (quotation.status !== QuotationStatus.SENT && quotation.status !== QuotationStatus.APPROVED) {
      throw new BadRequestException('Only sent or approved quotations can be accepted');
    }

    quotation.status = QuotationStatus.ACCEPTED;
    quotation.approvedBy = userId ?? null;
    quotation.approvedAt = new Date();

    const saved = await this.repo.save(quotation);

    const rfq = quotation.rfqId
      ? await this.rfqRepo.findOne({ where: { id: quotation.rfqId, deletedAt: IsNull() } })
      : null;
    const enquiry = quotation.enquiryId
      ? await this.enquiryRepo.findOne({ where: { id: quotation.enquiryId, deletedAt: IsNull() } })
      : null;
    const projectData = {
      name: dto.projectName,
      customerId: quotation.customerId,
      customerName: dto.customerName ?? quotation.customerName ?? rfq?.customerName ?? enquiry?.customerName ?? 'Unknown Customer',
      productName: dto.productName ?? enquiry?.productName ?? dto.projectName,
      description: `Project from quotation ${quotation.quotationNumber}`,
      projectValue: quotation.totalAmount,
      targetDeliveryDate: quotation.validUntil,
      quotationId: id,
      rfqId: quotation.rfqId,
    };

    await this.auditService.logBusinessEvent(
      'quotation.accepted', 'Quotation', id, userId ?? 'system',
      { quotationNumber: saved.quotationNumber, projectName: dto.projectName, tenantId },
    );
    await this.aiService.syncEntityContext('quotation', id, {
      quotationNumber: saved.quotationNumber,
      status: QuotationStatus.ACCEPTED,
      projectName: dto.projectName,
    }, userId, tenantId);

    return { quotation: saved, projectData };
  }

  async rejectQuotation(
    id: string,
    dto: RejectQuotationDto,
    userId?: string,
    tenantId?: string | null,
  ): Promise<Quotation> {
    const quotation = await this.findOne(id, tenantId);
    if (quotation.status !== QuotationStatus.SENT && quotation.status !== QuotationStatus.APPROVED) {
      throw new BadRequestException('Only sent or approved quotations can be rejected');
    }

    quotation.status = QuotationStatus.REJECTED;
    quotation.rejectionReason = dto.reason;
    quotation.updatedBy = userId ?? null;

    const saved = await this.repo.save(quotation);

    await this.auditService.logBusinessEvent(
      'quotation.rejected', 'Quotation', id, userId ?? 'system',
      { quotationNumber: saved.quotationNumber, reason: dto.reason, tenantId },
    );
    return saved;
  }
}
