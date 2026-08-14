import { KnowledgeIndexingService } from './knowledge-indexing.service';
import { EngineeringDomainEvent } from '../../engineering/events/engineering.events';
import { CommercialDomainEvent, CommercialEventType } from '../../commercial/events/commercial.events';

const UUID = '11111111-1111-1111-1111-111111111111';
const TENANT = '22222222-2222-2222-2222-222222222222';

describe('KnowledgeIndexingService', () => {
  let catalog: { upsertCatalogEntry: jest.Mock };
  let embedding: { upsertEmbedding: jest.Mock };
  let repo: object;
  let engBus: { subscribe: jest.Mock };
  let commercialBus: { subscribe: jest.Mock };
  let service: KnowledgeIndexingService;

  beforeEach(() => {
    catalog = { upsertCatalogEntry: jest.fn().mockResolvedValue({ id: 'entry-1' }) };
    embedding = { upsertEmbedding: jest.fn().mockResolvedValue({ id: 'emb-1' }) };
    repo = {};
    engBus = { subscribe: jest.fn() };
    commercialBus = { subscribe: jest.fn() };
    service = new KnowledgeIndexingService(catalog as any, embedding as any, repo as any, engBus as any, commercialBus as any);
  });

  it('subscribes to both the engineering and commercial buses on init', () => {
    service.onModuleInit();
    expect(engBus.subscribe).toHaveBeenCalledWith(service);
    expect(commercialBus.subscribe).toHaveBeenCalledWith(service);
  });

  it('indexes commercial events into the catalog + embeddings', async () => {
    const event: CommercialDomainEvent = {
      eventType: CommercialEventType.QUOTATION_ACCEPTED,
      timestamp: new Date(),
      tenantId: TENANT,
      actorId: null,
      payload: {
        quotationId: UUID,
        quotationNumber: 'QTN-2026-0001',
        customerId: null,
        projectId: null,
        projectName: 'Mold XYZ',
      },
    };

    await service.handle(event);

    expect(catalog.upsertCatalogEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT,
        entityType: 'quotation',
        entityId: UUID,
        title: 'QTN-2026-0001',
        summary: null,
        sourceDomain: 'commercial',
        searchText: 'QTN-2026-0001 Mold XYZ',
      }),
    );
    expect(embedding.upsertEmbedding).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'quotation', entityId: UUID, tenantId: TENANT }),
    );
  });

  it('indexes customer events as the customer entity type', async () => {
    await service.handle({
      eventType: CommercialEventType.CUSTOMER_CREATED,
      timestamp: new Date(),
      tenantId: TENANT,
      actorId: null,
      payload: { customerId: UUID, name: 'Acme', industry: 'Automotive' },
    } as CommercialDomainEvent);

    expect(catalog.upsertCatalogEntry).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'customer', entityId: UUID, sourceDomain: 'commercial' }),
    );
    expect(embedding.upsertEmbedding).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'customer', entityId: UUID }),
    );
  });

  it('keeps indexing engineering events (regression)', async () => {
    const event: EngineeringDomainEvent = {
      eventType: 'engineering.drawing.released' as never,
      occurredAt: new Date(),
      tenantId: TENANT,
      actorId: null,
      payload: { entityId: UUID, documentNumber: 'DRG-001' },
    };

    await service.handle(event);

    expect(catalog.upsertCatalogEntry).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'analytics', entityId: UUID, sourceDomain: 'engineering' }),
    );
  });

  it('skips events without a resolvable entity id', async () => {
    await service.handle({
      eventType: CommercialEventType.QUOTATION_SENT,
      timestamp: new Date(),
      tenantId: TENANT,
      actorId: null,
      payload: { quotationNumber: 'QTN-1' },
    } as CommercialDomainEvent);

    expect(catalog.upsertCatalogEntry).not.toHaveBeenCalled();
    expect(embedding.upsertEmbedding).not.toHaveBeenCalled();
  });

  it('skips non-commercial events unknown to the domain map', async () => {
    await service.handle({
      eventType: 'machine.stopped' as never,
      occurredAt: new Date(),
      tenantId: TENANT,
      actorId: null,
      payload: { entityId: UUID },
    } as unknown as EngineeringDomainEvent);

    expect(catalog.upsertCatalogEntry).not.toHaveBeenCalled();
  });
});
