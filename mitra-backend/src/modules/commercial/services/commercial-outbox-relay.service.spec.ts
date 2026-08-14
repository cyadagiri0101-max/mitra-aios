import { CommercialOutboxRelayService } from './commercial-outbox-relay.service';
import { DomainOutboxMessage } from '@modules/platform/entities/domain-outbox.entity';
import { CommercialEventType } from '../events/commercial.events';

describe('CommercialOutboxRelayService', () => {
  let outbox: {
    relay: jest.Mock;
    retryFailed: jest.Mock;
  };
  let bus: { publish: jest.Mock };
  let relay: CommercialOutboxRelayService;

  beforeEach(() => {
    outbox = {
      relay: jest.fn().mockImplementation(async (_max, dispatch) => {
        await dispatch({
          id: 'o1',
          eventType: 'quotation.accepted',
          tenantId: null,
          createdBy: 'user-1',
          payload: { quotationId: '11111111-1111-1111-1111-111111111111' },
        } as unknown as DomainOutboxMessage);
        return { relayed: 1, failed: 0 };
      }),
      retryFailed: jest.fn().mockResolvedValue(0),
    };
    bus = { publish: jest.fn() };
    relay = new CommercialOutboxRelayService(outbox as any, bus as any);
  });

  it('relays commercial outbox rows through the commercial event bus', async () => {
    const result = await relay.relay(10);
    expect(result).toEqual({ relayed: 1, failed: 0 });
    expect(outbox.relay).toHaveBeenCalledWith(10, expect.any(Function));
    expect(bus.publish).toHaveBeenCalledTimes(1);
    const event = bus.publish.mock.calls[0][0];
    expect(event.eventType).toBe('quotation.accepted');
    expect(event.tenantId).toBeNull();
    expect(event.actorId).toBe('user-1');
    expect(event.payload).toEqual({ quotationId: '11111111-1111-1111-1111-111111111111' });
  });

  it('skips outbox rows that do not belong to the commercial domain', async () => {
    outbox.relay.mockImplementationOnce(async (_max, dispatch) => {
      await dispatch({
        id: 'o2',
        eventType: 'engineering.drawing.released',
        tenantId: null,
        createdBy: null,
        payload: { entityId: '11111111-1111-1111-1111-111111111111' },
      } as unknown as DomainOutboxMessage);
      await dispatch({
        id: 'o3',
        eventType: CommercialEventType.CREDIT_NOTE_APPLIED,
        tenantId: null,
        createdBy: null,
        payload: { creditNoteId: '22222222-2222-2222-2222-222222222222', creditNoteNumber: 'CN-1', invoiceId: null, amount: 5 },
      } as unknown as DomainOutboxMessage);
      return { relayed: 2, failed: 0 };
    });

    await relay.relay(10);
    expect(bus.publish).toHaveBeenCalledTimes(1);
    expect(bus.publish.mock.calls[0][0].eventType).toBe(CommercialEventType.CREDIT_NOTE_APPLIED);
  });

  it('retryAndRelay re-arms failed rows before relaying', async () => {
    outbox.retryFailed.mockResolvedValue(2);
    await relay.retryAndRelay(50);
    expect(outbox.retryFailed).toHaveBeenCalledWith(50);
    expect(outbox.relay).toHaveBeenCalledWith(50, expect.any(Function));
  });

  it('isCommercialEventType classifies event types correctly', () => {
    const { isCommercialEventType } = require('../events/commercial.events');
    expect(isCommercialEventType('customer.created')).toBe(true);
    expect(isCommercialEventType('invoice.issued')).toBe(true);
    expect(isCommercialEventType('engineering.drawing.released')).toBe(false);
    expect(isCommercialEventType('service.request.created')).toBe(false);
  });
});
