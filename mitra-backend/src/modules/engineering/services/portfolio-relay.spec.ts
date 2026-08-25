import { Test, TestingModule } from '@nestjs/testing';
import { EngineeringOutboxRelayService } from './engineering-outbox-relay.service';
import { EngineeringEventBus } from './engineering-event-bus.service';
import { EngineeringAiHooksService } from './engineering-ai-hooks.service';
import { OutboxService } from '../../platform/services/outbox.service';
import { EngineeringDomainEventType } from '../events/engineering.events';
import { DomainOutboxMessage, OutboxStatus } from '../../platform/entities/domain-outbox.entity';

describe('M12.5 Sprint 3: Engineering Outbox Relay for Portfolio Events', () => {
  let relayService: EngineeringOutboxRelayService;
  let eventBus: EngineeringEventBus;
  let outboxService: OutboxService;
  let publishedEvents: any[] = [];

  beforeEach(async () => {
    publishedEvents = [];

    const mockEventBus = {
      publish: jest.fn((event) => publishedEvents.push(event)),
    };

    const mockAiHooks = {
      dispatchEvent: jest.fn().mockResolvedValue(undefined),
    };

    const mockOutboxService = {
      relay: jest.fn(async (maxRows, dispatch) => {
        const mockRows: Partial<DomainOutboxMessage>[] = [
          {
            id: 'outbox-1',
            eventType: EngineeringDomainEventType.PORTFOLIO_ALLOCATION_CREATED,
            tenantId: 'tenant-1',
            createdBy: 'USER-1',
            payload: { allocationId: 'alloc-1', projectId: 'BM289' },
            status: OutboxStatus.PENDING,
          },
          {
            id: 'outbox-2',
            eventType: EngineeringDomainEventType.PORTFOLIO_SNAPSHOT_CREATED,
            tenantId: 'tenant-1',
            createdBy: 'USER-1',
            payload: { snapshotId: 'snap-1', snapshotName: 'Q3 Baseline' },
            status: OutboxStatus.PENDING,
          },
        ];

        let relayed = 0;
        for (const row of mockRows) {
          await dispatch(row as DomainOutboxMessage);
          relayed += 1;
        }
        return { relayed, failed: 0 };
      }),
      retryFailed: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringOutboxRelayService,
        { provide: EngineeringEventBus, useValue: mockEventBus },
        { provide: EngineeringAiHooksService, useValue: mockAiHooks },
        { provide: OutboxService, useValue: mockOutboxService },
      ],
    }).compile();

    relayService = module.get<EngineeringOutboxRelayService>(EngineeringOutboxRelayService);
    eventBus = module.get<EngineeringEventBus>(EngineeringEventBus);
    outboxService = module.get<OutboxService>(OutboxService);
  });

  it('relays portfolio outbox messages to EngineeringEventBus', async () => {
    const result = await relayService.relay(10);

    expect(result.relayed).toBe(2);
    expect(result.failed).toBe(0);
    expect(eventBus.publish).toHaveBeenCalledTimes(2);

    expect(publishedEvents[0].eventType).toBe(EngineeringDomainEventType.PORTFOLIO_ALLOCATION_CREATED);
    expect(publishedEvents[0].tenantId).toBe('tenant-1');
    expect(publishedEvents[0].payload.allocationId).toBe('alloc-1');

    expect(publishedEvents[1].eventType).toBe(EngineeringDomainEventType.PORTFOLIO_SNAPSHOT_CREATED);
    expect(publishedEvents[1].tenantId).toBe('tenant-1');
    expect(publishedEvents[1].payload.snapshotId).toBe('snap-1');
  });

  it('re-arms failed messages and executes relay cycle', async () => {
    const result = await relayService.retryAndRelay(10);
    expect(outboxService.retryFailed).toHaveBeenCalledWith(10);
    expect(result.relayed).toBe(2);
  });
});
