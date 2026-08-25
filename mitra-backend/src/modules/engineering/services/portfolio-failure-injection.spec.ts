import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PortfolioSnapshotService } from './portfolio-snapshot.service';
import { PortfolioDemandService } from './portfolio-demand.service';
import { PortfolioCapacityService } from './portfolio-capacity.service';
import { PortfolioBalancingService } from './portfolio-balancing.service';
import { OutboxService } from '../../platform/services/outbox.service';
import { EnterprisePortfolioSnapshot } from '../entities/enterprise-portfolio-snapshot.entity';
import { CrossProjectAllocation } from '../entities/cross-project-allocation.entity';
import { EngineeringEventBus } from './engineering-event-bus.service';
import { EngineeringDomainEventType } from '../events/engineering.events';

describe('M12.5 Sprint 3: Portfolio Real-Time Failure Injection Suite', () => {
  let service: PortfolioSnapshotService;
  let outboxService: OutboxService;
  let eventBus: EngineeringEventBus;
  let allocationRepo: any;

  const mockTenantId = 'tenant-failure-test-01';

  beforeEach(async () => {
    allocationRepo = {
      create: jest.fn((dto) => ({ id: 'alloc-fail-1', ...dto })),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const mockOutboxService = {
      append: jest.fn().mockResolvedValue({ id: 'outbox-msg-1' }),
    };

    eventBus = new EngineeringEventBus();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioSnapshotService,
        { provide: getRepositoryToken(EnterprisePortfolioSnapshot), useValue: {} },
        { provide: getRepositoryToken(CrossProjectAllocation), useValue: allocationRepo },
        { provide: PortfolioDemandService, useValue: {} },
        { provide: PortfolioCapacityService, useValue: {} },
        { provide: PortfolioBalancingService, useValue: {} },
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: EngineeringEventBus, useValue: eventBus },
      ],
    }).compile();

    service = module.get<PortfolioSnapshotService>(PortfolioSnapshotService);
    outboxService = module.get<OutboxService>(OutboxService);
  });

  it('Failure Scenario 1: DB allocation save exception aborts outbox append', async () => {
    allocationRepo.save.mockRejectedValueOnce(new Error('Database unique constraint violation'));

    await expect(
      service.createAllocation(
        mockTenantId,
        {
          projectId: 'BM289',
          engineerId: 'ENG-1',
          allocationRole: 'LEAD_DESIGNER',
          allocatedHoursPerWeek: 20,
          startDate: '2026-09-01',
          endDate: '2026-10-01',
        },
        'ACTOR-1',
      ),
    ).rejects.toThrow('Database unique constraint violation');

    // Outbox append must NOT be called if the entity failed to save
    expect(outboxService.append).not.toHaveBeenCalled();
  });

  it('Failure Scenario 2: Event deduplication ignores duplicate rapid event dispatches', () => {
    let callCount = 0;
    eventBus.subscribe({
      name: 'TestSubscriber',
      handle: () => {
        callCount++;
      },
    });

    const fixedDate = new Date('2026-08-25T10:00:00Z');
    const event = {
      eventType: EngineeringDomainEventType.PORTFOLIO_ALLOCATION_CREATED,
      tenantId: mockTenantId,
      occurredAt: fixedDate,
      payload: { entityId: 'alloc-fixed-100', projectId: 'BM289' },
    };

    // Publish identical event twice
    eventBus.publish(event);
    eventBus.publish(event);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Due to dedupe key (${eventType}:${entityId}:${timestamp}), second publish is suppressed
        expect(callCount).toBe(1);
        resolve();
      }, 50);
    });
  });

  it('Failure Scenario 3: Subscriber failure is isolated and does not break event bus', () => {
    let secondSubscriberCalled = false;

    eventBus.subscribe({
      name: 'FailingSubscriber',
      handle: () => {
        throw new Error('Downstream network crash');
      },
    });

    eventBus.subscribe({
      name: 'HealthySubscriber',
      handle: () => {
        secondSubscriberCalled = true;
      },
    });

    eventBus.publish({
      eventType: EngineeringDomainEventType.PORTFOLIO_SNAPSHOT_CREATED,
      tenantId: mockTenantId,
      occurredAt: new Date(),
      payload: { entityId: 'snap-iso-1' },
    });

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(secondSubscriberCalled).toBe(true);
        resolve();
      }, 50);
    });
  });
});
