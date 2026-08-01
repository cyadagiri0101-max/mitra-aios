import { DomainEventBus } from './domain-event-bus.service';
import { ProjectDomainEventType } from '../events/project.events';

describe('DomainEventBus', () => {
  let bus: DomainEventBus;

  beforeEach(() => {
    bus = new DomainEventBus();
  });

  afterEach(() => {
    bus.onModuleDestroy();
  });

  const makeEvent = () => ({
    eventType: ProjectDomainEventType.PROJECT_CREATED,
    occurredAt: new Date(),
    projectId: 'p-1',
    tenantId: 't-1',
    actorId: 'u-1',
    payload: {},
  });

  it('registers subscribers and reports count', () => {
    expect(bus.subscriberCount()).toBe(0);
    const unsub = bus.subscribe({ name: 'a', handle: jest.fn() });
    expect(bus.subscriberCount()).toBe(1);
    unsub();
    expect(bus.subscriberCount()).toBe(0);
  });

  it('delivers events to subscribers asynchronously', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    bus.subscribe({ name: 'a', handle: handler });
    bus.publish(makeEvent());
    await new Promise((r) => setTimeout(r, 10));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('deduplicates identical events (same type/project/timestamp)', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    bus.subscribe({ name: 'a', handle: handler });
    const evt = makeEvent();
    bus.publish(evt);
    bus.publish(evt);
    await new Promise((r) => setTimeout(r, 10));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('isolates subscriber failures — publisher never throws', async () => {
    const failing = jest.fn().mockRejectedValue(new Error('boom'));
    const ok = jest.fn().mockResolvedValue(undefined);
    bus.subscribe({ name: 'failing', handle: failing });
    bus.subscribe({ name: 'ok', handle: ok });
    expect(() => bus.publish(makeEvent())).not.toThrow();
    await new Promise((r) => setTimeout(r, 10));
    expect(ok).toHaveBeenCalledTimes(1);
  });
});
