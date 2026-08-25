import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioOrchestrationController } from './portfolio-orchestration.controller';
import { PortfolioSnapshotService } from '../services/portfolio-snapshot.service';
import { PortfolioDemandService } from '../services/portfolio-demand.service';
import { PortfolioCapacityService } from '../services/portfolio-capacity.service';
import { PortfolioBalancingService } from '../services/portfolio-balancing.service';
import { PortfolioScenarioService } from '../services/portfolio-scenario.service';
import { EngineeringEventBus } from '../services/engineering-event-bus.service';
import { EngineeringDomainEventType } from '../events/engineering.events';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { firstValueFrom, Subject } from 'rxjs';

describe('M12.5 Sprint 3: Portfolio Real-Time Event Stream Controller', () => {
  let controller: PortfolioOrchestrationController;
  let eventBus: EngineeringEventBus;
  let eventSubject: Subject<any>;

  beforeEach(async () => {
    eventSubject = new Subject();

    const mockEventBus = {
      toObservable: jest.fn(() => eventSubject.asObservable()),
      publish: jest.fn((event) => eventSubject.next(event)),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortfolioOrchestrationController],
      providers: [
        { provide: PortfolioSnapshotService, useValue: {} },
        { provide: PortfolioDemandService, useValue: {} },
        { provide: PortfolioCapacityService, useValue: {} },
        { provide: PortfolioBalancingService, useValue: {} },
        { provide: PortfolioScenarioService, useValue: {} },
        { provide: EngineeringEventBus, useValue: mockEventBus },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PortfolioOrchestrationController>(PortfolioOrchestrationController);
    eventBus = module.get<EngineeringEventBus>(EngineeringEventBus);
  });

  it('streams portfolio events matching authenticated tenant', async () => {
    const req = { user: { tenantId: 'tenant-automotive-01', userId: 'USER-1' } };
    const stream$ = controller.streamPortfolioEvents(req);

    const receivedPromise = firstValueFrom(stream$);

    eventSubject.next({
      eventType: EngineeringDomainEventType.PORTFOLIO_ALLOCATION_CREATED,
      tenantId: 'tenant-automotive-01',
      occurredAt: new Date('2026-08-25T10:00:00Z'),
      payload: { allocationId: 'alloc-1', projectId: 'BM289' },
    });

    const msg = await receivedPromise;
    expect(msg.data).toEqual({
      eventType: EngineeringDomainEventType.PORTFOLIO_ALLOCATION_CREATED,
      tenantId: 'tenant-automotive-01',
      entityId: 'alloc-1',
      projectId: 'BM289',
      timestamp: '2026-08-25T10:00:00.000Z',
    });
  });

  it('strictly filters out foreign tenant events (Zero Cross-Tenant Leakage)', async () => {
    const req = { user: { tenantId: 'tenant-automotive-01', userId: 'USER-1' } };
    const stream$ = controller.streamPortfolioEvents(req);

    let receivedCount = 0;
    const sub = stream$.subscribe(() => {
      receivedCount++;
    });

    // Foreign tenant mutation
    eventSubject.next({
      eventType: EngineeringDomainEventType.PORTFOLIO_ALLOCATION_CREATED,
      tenantId: 'tenant-aerospace-99', // FOREIGN TENANT
      occurredAt: new Date(),
      payload: { allocationId: 'alloc-99', projectId: 'AERO-X' },
    });

    // Non-portfolio event for same tenant
    eventSubject.next({
      eventType: EngineeringDomainEventType.DRAWING_CREATED, // NON-PORTFOLIO
      tenantId: 'tenant-automotive-01',
      occurredAt: new Date(),
      payload: { entityId: 'dwg-1' },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(receivedCount).toBe(0);

    // Matching portfolio event
    eventSubject.next({
      eventType: EngineeringDomainEventType.PORTFOLIO_SNAPSHOT_CREATED,
      tenantId: 'tenant-automotive-01',
      occurredAt: new Date(),
      payload: { snapshotId: 'snap-1', snapshotName: 'Baseline' },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(receivedCount).toBe(1);

    sub.unsubscribe();
  });
});
