import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeCatalogService } from './knowledgecatalog.service';
import { KnowledgeCatalogEntry, KnowledgeCatalogEntityType } from '../entities/knowledge-catalog.entity';
import { EmbeddingService } from '@modules/ai/services/embedding.service';
import { EmbeddingEntityType } from '@modules/ai/entities/knowledge-embedding.entity';
import { EngineeringDomainEvent, EngineeringDomainEventSubscriber } from '../../engineering/events/engineering.events';
import { EngineeringEventBus } from '../../engineering/services/engineering-event-bus.service';
import { CommercialDomainEvent, CommercialDomainEventSubscriber, isCommercialEventType } from '../../commercial/events/commercial.events';
import { CommercialEventBus } from '../../commercial/services/commercial-event-bus.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Coerce UUID-typed columns: placeholders like 'default'/'system' become NULL. */
function toUuidOrNull(value?: string | null): string | null {
  return value && UUID_RE.test(value) ? value : null;
}

@Injectable()
export class KnowledgeIndexingService implements OnModuleInit, EngineeringDomainEventSubscriber, CommercialDomainEventSubscriber {
  private readonly logger = new Logger(KnowledgeIndexingService.name);
  readonly name = 'knowledge-indexing';

  constructor(
    private readonly catalogService: KnowledgeCatalogService,
    private readonly embedding: EmbeddingService,
    @InjectRepository(KnowledgeCatalogEntry)
    private readonly repo: Repository<KnowledgeCatalogEntry>,
    private readonly eventBus: EngineeringEventBus,
    private readonly commercialBus: CommercialEventBus,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe(this);
    this.commercialBus.subscribe(this);
  }

  async handle(event: EngineeringDomainEvent | CommercialDomainEvent): Promise<void> {
    const payload: Record<string, any> = event.payload ?? {};
    const entityId = this.entityIdFrom(payload);
    const tenantId = toUuidOrNull((event as { tenantId?: string | null }).tenantId ?? payload.tenantId);
    const sourceDomain = this.sourceDomainFrom(event.eventType);

    if (!entityId || !sourceDomain) {
      this.logger.debug(`Skipping knowledge indexing for unsupported event ${event.eventType}`);
      return;
    }

    const entityType = this.entityTypeFrom(event.eventType);
    const title = payload.title ?? payload.name ?? payload.projectNumber ?? payload.entityNumber ?? payload.documentNumber ?? payload.srNumber ?? payload.capaNumber ?? payload.workOrderNumber ?? payload.enquiryNumber ?? payload.rfqNumber ?? payload.quotationNumber ?? payload.salesOrderNumber ?? payload.invoiceNumber ?? payload.paymentNumber ?? payload.creditNoteNumber ?? `${sourceDomain}:${entityId}`;
    const summary = payload.summary ?? payload.description ?? payload.problemDescription ?? payload.issueDescription ?? payload.rootCause ?? payload.correctiveAction ?? payload.observations ?? payload.reason ?? null;
    const searchText = [title, summary, payload.entityNumber, payload.customerName, payload.projectNumber, payload.productName, payload.projectName]
      .filter(Boolean)
      .join(' ')
      .trim();

    await this.catalogService.upsertCatalogEntry({
      tenantId,
      entityType,
      entityId,
      title,
      summary,
      sourceDomain,
      sourceRef: payload,
      tags: this.tagsFrom(event.eventType, payload),
      searchText,
    });

    await this.embedding.upsertEmbedding({
      entityType: this.embeddingTypeFrom(entityType),
      entityId,
      content: searchText || title,
      tenantId,
      metadata: payload,
    });
  }

  private entityIdFrom(payload: Record<string, any>): string | null {
    const candidates = [
      payload.entityId, payload.id, payload.customerId, payload.contactId,
      payload.enquiryId, payload.quotationId, payload.salesOrderId,
      payload.invoiceId, payload.paymentId, payload.creditNoteId, payload.projectId,
    ];
    for (const candidate of candidates) {
      if (candidate) return toUuidOrNull(candidate);
    }
    return null;
  }

  private sourceDomainFrom(eventType: string): string | null {
    if (isCommercialEventType(eventType)) return 'commercial';
    if (eventType.startsWith('engineering.')) return 'engineering';
    if (eventType.startsWith('manufacturing.')) return 'manufacturing';
    if (eventType.startsWith('quality.')) return 'quality';
    if (eventType.startsWith('service.')) return 'service';
    if (eventType.startsWith('project.')) return 'project';
    return null;
  }

  private entityTypeFrom(eventType: string): KnowledgeCatalogEntityType {
    if (eventType.includes('project')) return KnowledgeCatalogEntityType.PROJECT;
    if (eventType.includes('work_order') || eventType.includes('job')) return KnowledgeCatalogEntityType.WORK_ORDER;
    if (eventType.includes('capa')) return KnowledgeCatalogEntityType.CAPA;
    if (eventType.includes('service')) return KnowledgeCatalogEntityType.SERVICE;
    if (eventType.includes('knowledge')) return KnowledgeCatalogEntityType.KNOWLEDGE;
    if (eventType.includes('trial')) return KnowledgeCatalogEntityType.TRIAL;
    if (eventType.includes('credit_note')) return KnowledgeCatalogEntityType.CREDIT_NOTE;
    if (eventType.includes('sales_order')) return KnowledgeCatalogEntityType.SALES_ORDER;
    if (eventType.includes('quotation')) return KnowledgeCatalogEntityType.QUOTATION;
    if (eventType.includes('invoice')) return KnowledgeCatalogEntityType.INVOICE;
    if (eventType.includes('payment')) return KnowledgeCatalogEntityType.PAYMENT;
    if (eventType.includes('customer')) return KnowledgeCatalogEntityType.CUSTOMER;
    if (eventType.includes('contact')) return KnowledgeCatalogEntityType.CUSTOMER;
    if (eventType.includes('rfq')) return KnowledgeCatalogEntityType.ENQUIRY;
    return KnowledgeCatalogEntityType.ANALYTICS;
  }

  private embeddingTypeFrom(entityType: KnowledgeCatalogEntityType): EmbeddingEntityType {
    switch (entityType) {
      case KnowledgeCatalogEntityType.CAPA: return EmbeddingEntityType.CAPA;
      case KnowledgeCatalogEntityType.PROJECT: return EmbeddingEntityType.PROJECT;
      case KnowledgeCatalogEntityType.SERVICE: return EmbeddingEntityType.SERVICE;
      case KnowledgeCatalogEntityType.WORK_ORDER: return EmbeddingEntityType.WORK_ORDER;
      case KnowledgeCatalogEntityType.KNOWLEDGE: return EmbeddingEntityType.KNOWLEDGE;
      case KnowledgeCatalogEntityType.TRIAL: return EmbeddingEntityType.TRIAL;
      case KnowledgeCatalogEntityType.CUSTOMER: return EmbeddingEntityType.CUSTOMER;
      case KnowledgeCatalogEntityType.ENQUIRY: return EmbeddingEntityType.ENQUIRY;
      case KnowledgeCatalogEntityType.QUOTATION: return EmbeddingEntityType.QUOTATION;
      case KnowledgeCatalogEntityType.SALES_ORDER: return EmbeddingEntityType.SALES_ORDER;
      case KnowledgeCatalogEntityType.INVOICE: return EmbeddingEntityType.INVOICE;
      case KnowledgeCatalogEntityType.PAYMENT: return EmbeddingEntityType.PAYMENT;
      case KnowledgeCatalogEntityType.CREDIT_NOTE: return EmbeddingEntityType.CREDIT_NOTE;
      default: return EmbeddingEntityType.KNOWLEDGE;
    }
  }

  private tagsFrom(eventType: string, payload: Record<string, any>): string[] {
    const tags = [eventType.replace(/[:.]/g, '-')];
    if (payload.projectNumber) tags.push(payload.projectNumber);
    if (payload.customerName) tags.push(payload.customerName);
    if (payload.partNumber) tags.push(payload.partNumber);
    if (payload.toolNo) tags.push(payload.toolNo);
    return [...new Set(tags)].slice(0, 8);
  }
}
