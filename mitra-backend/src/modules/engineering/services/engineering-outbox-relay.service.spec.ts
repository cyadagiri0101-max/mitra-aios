import { EngineeringOutboxRelayService } from './engineering-outbox-relay.service';
import { DomainOutboxMessage } from '@modules/platform/entities/domain-outbox.entity';
import { CommercialEventType } from '../../commercial/events/commercial.events';

describe('EngineeringOutboxRelayService', () => {
  let outbox: { relay: jest.Mock; retryFailed: jest.Mock };
  let eventBus: { publish: jest.Mock };
  let aiHooks: { dispatchEvent: jest.Mock };
  let relay: EngineeringOutboxRelayService;

  beforeEach(() => {
    outbox = {
      relay: jest.fn().mockResolvedValue({ relayed: 0, failed: 0 }),
      retryFailed: jest.fn().mockResolvedValue(0),
    };
    eventBus = { publish: jest.fn() };
    aiHooks = { dispatchEvent: jest.fn().mockResolvedValue({ dispatched: 0 }) };
    relay = new EngineeringOutboxRelayService(outbox as any, eventBus as any, aiHooks as any);
  });

  it('dispatches engineering domain rows to the engineering bus + AI hooks', async () => {
    outbox.relay.mockImplementationOnce(async (_max, dispatch) => {
      await dispatch({
        id: 'o1',
        eventType: 'engineering.drawing.released',
        tenantId: null,
        createdBy: null,
        payload: { entityId: '11111111-1111-1111-1111-111111111111' },
      } as unknown as DomainOutboxMessage);
      return { relayed: 1, failed: 0 };
    });

    await relay.relay(10);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish.mock.calls[0][0].eventType).toBe('engineering.drawing.released');
    expect(aiHooks.dispatchEvent).toHaveBeenCalledTimes(1);
  });

  it('never casts commercial rows into engineering events', async () => {
    outbox.relay.mockImplementationOnce(async (_max, dispatch) => {
      await dispatch({
        id: 'o2',
        eventType: CommercialEventType.QUOTATION_CREATED,
        tenantId: null,
        createdBy: null,
        payload: { quotationId: '22222222-2222-2222-2222-222222222222' },
      } as unknown as DomainOutboxMessage);
      return { relayed: 1, failed: 0 };
    });

    await relay.relay(10);
    expect(eventBus.publish).not.toHaveBeenCalled();
    expect(aiHooks.dispatchEvent).not.toHaveBeenCalled();
  });
});
