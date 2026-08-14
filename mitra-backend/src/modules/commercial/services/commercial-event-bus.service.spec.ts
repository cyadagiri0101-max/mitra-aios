import { CommercialEventBus } from './commercial-event-bus.service';
import { CommercialEventType } from '../events/commercial.events';

describe('CommercialEventBus', () => {
  let bus: CommercialEventBus;

  beforeEach(() => {
    bus = new CommercialEventBus();
  });

  afterEach(() => {
    bus.onModuleDestroy();
  });

  it('delivers published events to registered subscribers', async () => {
    const handled: string[] = [];
    bus.subscribe({
      name: 'test-subscriber',
      handle: (event) => {
        handled.push(event.eventType);
      },
    });

    bus.publish({
      eventType: CommercialEventType.QUOTATION_CREATED,
      timestamp: new Date(),
      tenantId: null,
      actorId: null,
      payload: { quotationId: '11111111-1111-1111-1111-111111111111', quotationNumber: 'QTN-1', enquiryId: null, customerId: null, totalAmount: 100 },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(handled).toEqual([CommercialEventType.QUOTATION_CREATED]);
    expect(bus.subscriberCount()).toBe(1);
  });

  it('deduplicates identical events', async () => {
    let count = 0;
    bus.subscribe({
      name: 'counting-subscriber',
      handle: () => {
        count += 1;
      },
    });

    const event = {
      eventType: CommercialEventType.RFQ_SUBMITTED,
      timestamp: new Date('2026-08-11T10:00:00Z'),
      tenantId: null,
      actorId: null,
      payload: { enquiryId: '11111111-1111-1111-1111-111111111111', enquiryNumber: 'RFQ-1', customerName: null, productName: null },
    };
    bus.publish(event as any);
    bus.publish(event as any);

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(count).toBe(1);
  });

  it('isolates subscriber failures and still delivers to others', async () => {
    const healthy: string[] = [];
    bus.subscribe({ name: 'failing', handle: () => { throw new Error('boom'); } });
    bus.subscribe({ name: 'healthy', handle: (event) => { healthy.push(event.eventType); } });

    bus.publish({
      eventType: CommercialEventType.PAYMENT_RECORDED,
      timestamp: new Date(),
      tenantId: null,
      actorId: null,
      payload: { paymentId: '11111111-1111-1111-1111-111111111111', paymentNumber: 'PAY-1', invoiceId: '22222222-2222-2222-2222-222222222222', amount: 10, currency: 'INR', method: 'BANK_TRANSFER' },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(healthy).toEqual([CommercialEventType.PAYMENT_RECORDED]);
  });

  it('unsubscribes and stops delivery', async () => {
    let count = 0;
    const unsubscribe = bus.subscribe({
      name: 'temp',
      handle: () => {
        count += 1;
      },
    });
    unsubscribe();

    bus.publish({
      eventType: CommercialEventType.INVOICE_ISSUED,
      timestamp: new Date(),
      tenantId: null,
      actorId: null,
      payload: { invoiceId: '11111111-1111-1111-1111-111111111111', invoiceNumber: 'INV-1', totalAmount: 10 },
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(count).toBe(0);
  });
});
