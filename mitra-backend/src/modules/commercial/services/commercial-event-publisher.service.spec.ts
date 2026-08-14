import { CommercialEventPublisherService } from './commercial-event-publisher.service';
import { CommercialEventType } from '../events/commercial.events';

describe('CommercialEventPublisherService', () => {
  let outbox: { append: jest.Mock };
  let publisher: CommercialEventPublisherService;

  beforeEach(() => {
    outbox = { append: jest.fn().mockResolvedValue({ id: 'outbox-1' }) };
    publisher = new CommercialEventPublisherService(outbox as any);
  });

  it('persists a customer event as a durable outbox row (G-13)', async () => {
    await publisher.publish({
      eventType: CommercialEventType.CUSTOMER_CREATED,
      timestamp: new Date('2026-08-11T10:00:00Z'),
      tenantId: '22222222-2222-2222-2222-222222222222',
      actorId: '33333333-3333-3333-3333-333333333333',
      payload: { customerId: '44444444-4444-4444-4444-444444444444', name: 'Acme', industry: 'Automotive' },
    });

    expect(outbox.append).toHaveBeenCalledTimes(1);
    const [eventType, aggregateType, aggregateId, payload, opts] = outbox.append.mock.calls[0];
    expect(eventType).toBe('customer.created');
    expect(aggregateType).toBe('customer');
    expect(aggregateId).toBe('44444444-4444-4444-4444-444444444444');
    expect(payload).toEqual({
      customerId: '44444444-4444-4444-4444-444444444444',
      name: 'Acme',
      industry: 'Automotive',
      entityId: '44444444-4444-4444-4444-444444444444',
    });
    expect(opts).toEqual({
      tenantId: '22222222-2222-2222-2222-222222222222',
      actorId: '33333333-3333-3333-3333-333333333333',
    });
  });

  it('maps aggregate types per event', async () => {
    const cases: Array<[CommercialEventType, string, string]> = [
      [CommercialEventType.RFQ_SUBMITTED, 'rfq', '11111111-1111-1111-1111-111111111111'],
      [CommercialEventType.QUOTATION_ACCEPTED, 'quotation', '11111111-1111-1111-1111-111111111111'],
      [CommercialEventType.PROJECT_CREATED, 'project', '11111111-1111-1111-1111-111111111111'],
      [CommercialEventType.SALES_ORDER_CREATED, 'sales_order', '11111111-1111-1111-1111-111111111111'],
      [CommercialEventType.INVOICE_ISSUED, 'invoice', '11111111-1111-1111-1111-111111111111'],
      [CommercialEventType.PAYMENT_RECORDED, 'payment', '11111111-1111-1111-1111-111111111111'],
      [CommercialEventType.CREDIT_NOTE_CREATED, 'credit_note', '11111111-1111-1111-1111-111111111111'],
      [CommercialEventType.CONTACT_ADDED, 'contact', '11111111-1111-1111-1111-111111111111'],
    ];
    for (const [eventType, aggregateType, id] of cases) {
      const idFieldByType: Record<string, string> = {
        [CommercialEventType.RFQ_SUBMITTED]: 'enquiryId',
        [CommercialEventType.QUOTATION_ACCEPTED]: 'quotationId',
        [CommercialEventType.PROJECT_CREATED]: 'projectId',
        [CommercialEventType.SALES_ORDER_CREATED]: 'salesOrderId',
        [CommercialEventType.INVOICE_ISSUED]: 'invoiceId',
        [CommercialEventType.PAYMENT_RECORDED]: 'paymentId',
        [CommercialEventType.CREDIT_NOTE_CREATED]: 'creditNoteId',
        [CommercialEventType.CONTACT_ADDED]: 'contactId',
      };
      await publisher.publish({
        eventType,
        timestamp: new Date(),
        tenantId: null,
        actorId: null,
        payload: { [idFieldByType[eventType]]: id } as any,
      });
      const call = outbox.append.mock.calls[outbox.append.mock.calls.length - 1];
      expect(call[1]).toBe(aggregateType);
      expect(call[2]).toBe(id);
    }
  });

  it('publishMany appends each event in order', async () => {
    await publisher.publishMany([
      {
        eventType: CommercialEventType.CUSTOMER_CREATED,
        timestamp: new Date(),
        tenantId: null,
        actorId: null,
        payload: { customerId: '11111111-1111-1111-1111-111111111111', name: 'A', industry: null },
      },
      {
        eventType: CommercialEventType.CUSTOMER_UPDATED,
        timestamp: new Date(),
        tenantId: null,
        actorId: null,
        payload: { customerId: '11111111-1111-1111-1111-111111111111', changes: {} },
      },
    ]);
    expect(outbox.append).toHaveBeenCalledTimes(2);
    expect(outbox.append.mock.calls[0][0]).toBe('customer.created');
    expect(outbox.append.mock.calls[1][0]).toBe('customer.updated');
  });

  it('propagates outbox failures to the caller', async () => {
    outbox.append.mockRejectedValueOnce(new Error('db down'));
    await expect(
      publisher.publish({
        eventType: CommercialEventType.CUSTOMER_CREATED,
        timestamp: new Date(),
        tenantId: null,
        actorId: null,
        payload: { customerId: '11111111-1111-1111-1111-111111111111', name: 'A', industry: null },
      }),
    ).rejects.toThrow('db down');
  });
});
