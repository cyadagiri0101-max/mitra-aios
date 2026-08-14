import { Injectable } from '@nestjs/common';
import { AcceptQuotationDto } from '../dto/quotation.dto';
import { QuotationService } from './quotation.service';
import { QuotationApprovalService } from './quotation-approval.service';
import { ProjectFactoryService, QuotationSnapshot } from '../../project/services/project-factory.service';
import { CommercialEventPublisherService } from './commercial-event-publisher.service';
import { CommercialEventType } from '../events/commercial.events';

@Injectable()
export class QuotationAcceptanceService {
  constructor(
    private readonly quotationService: QuotationService,
    private readonly approvalService: QuotationApprovalService,
    private readonly projectFactory: ProjectFactoryService,
    private readonly events: CommercialEventPublisherService,
  ) {}

  async acceptAndCreateProject(
    id: string,
    dto: AcceptQuotationDto,
    userId?: string,
    tenantId?: string | null,
  ) {
    const { quotation, projectData } = await this.approvalService.acceptQuotation(id, dto, userId, tenantId);

    const snapshot: QuotationSnapshot = {
      quotationId: quotation.id ?? id,
      quotationNumber: quotation.quotationNumber,
      customerId: quotation.customerId ?? null,
      customerName: dto.customerName ?? (projectData.customerName as string | undefined) ?? 'Unknown Customer',
      productName: dto.productName ?? (projectData.productName as string | undefined) ?? dto.projectName,
      projectName: dto.projectName,
      projectValue: (projectData.projectValue as number | undefined) ?? null,
      targetDeliveryDate: (projectData.targetDeliveryDate as Date | null | undefined) ?? null,
      rfqId: quotation.rfqId ?? null,
      currency: quotation.currency,
    };

    const { project } = await this.projectFactory.createFromQuotation(snapshot, userId ?? '', tenantId);

    await this.quotationService.linkProject(id, project.id, userId, tenantId);

    await this.events.publish({
      eventType: CommercialEventType.PROJECT_CREATED,
      timestamp: new Date(),
      tenantId: tenantId ?? null,
      actorId: userId ?? null,
      payload: {
        projectId: project.id,
        projectNumber: project.projectNumber,
        name: project.name,
        quotationId: quotation.id ?? id,
        customerId: quotation.customerId ?? null,
      },
    });

    return {
      quotation: { ...quotation, projectId: project.id, status: 'ACCEPTED' },
      project: { id: project.id, projectNumber: project.projectNumber, name: project.name },
    };
  }
}
