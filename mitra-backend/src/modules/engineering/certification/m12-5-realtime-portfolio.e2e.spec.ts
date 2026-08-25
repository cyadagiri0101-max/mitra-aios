import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PortfolioSnapshotService } from '../services/portfolio-snapshot.service';
import { PortfolioDemandService } from '../services/portfolio-demand.service';
import { PortfolioCapacityService } from '../services/portfolio-capacity.service';
import { PortfolioBalancingService } from '../services/portfolio-balancing.service';
import { PortfolioScenarioService } from '../services/portfolio-scenario.service';
import { PortfolioOrchestrationController } from '../controllers/portfolio-orchestration.controller';
import { EngineeringEventBus } from '../services/engineering-event-bus.service';
import { EngineeringOutboxRelayService } from '../services/engineering-outbox-relay.service';
import { EngineeringAiHooksService } from '../services/engineering-ai-hooks.service';
import { OutboxService } from '../../platform/services/outbox.service';
import { EnterprisePortfolioSnapshot } from '../entities/enterprise-portfolio-snapshot.entity';
import { CrossProjectAllocation } from '../entities/cross-project-allocation.entity';
import { DomainOutboxMessage, OutboxStatus } from '../../platform/entities/domain-outbox.entity';
import { EngineeringDomainEventType } from '../events/engineering.events';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { firstValueFrom, Subject } from 'rxjs';

describe('MITRA M12.5 Sprint 3 — Master E2E Real-Time Portfolio Intelligence Suite', () => {
  let controller: PortfolioOrchestrationController;
  let snapshotService: PortfolioSnapshotService;
  let relayService: EngineeringOutboxRelayService;
  let eventBus: EngineeringEventBus;

  // In-memory mock repositories
  const inMemoryAllocations = new Map<string, any>();
  const inMemorySnapshots = new Map<string, any>();
  const inMemoryOutbox: DomainOutboxMessage[] = [];

  const tenantA = 'tenant-auto-corp-alpha';
  const tenantB = 'tenant-aero-corp-beta';

  beforeEach(async () => {
    inMemoryAllocations.clear();
    inMemorySnapshots.clear();
    inMemoryOutbox.length = 0;

    const mockAllocationRepo = {
      create: jest.fn((dto) => {
        const entity = { id: `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, createdAt: new Date(), ...dto };
        return entity;
      }),
      save: jest.fn(async (entity) => {
        inMemoryAllocations.set(entity.id, entity);
        return entity;
      }),
      findOne: jest.fn(async ({ where }) => {
        for (const item of inMemoryAllocations.values()) {
          let match = true;
          if (where.id && item.id !== where.id) match = false;
          if (where.tenantId && item.tenantId !== where.tenantId) match = false;
          if (match) return item;
        }
        return null;
      }),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => Array.from(inMemoryAllocations.values())),
      })),
    };

    const mockSnapshotRepo = {
      create: jest.fn((dto) => {
        const entity = { id: `snap-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, createdAt: new Date(), ...dto };
        return entity;
      }),
      save: jest.fn(async (entity) => {
        inMemorySnapshots.set(entity.id, entity);
        return entity;
      }),
      findOne: jest.fn(async ({ where }) => {
        for (const item of inMemorySnapshots.values()) {
          if (where.tenantId && item.tenantId === where.tenantId) return item;
        }
        return null;
      }),
    };

    const mockDemandService = {
      calculatePortfolioDemand: jest.fn().mockResolvedValue({
        tenantId: tenantA,
        totalDemandHours: 480,
        totalDeliverablesCount: 20,
        activeProjectsCount: 2,
        uncalibratedDeliverablesCount: 0,
        projects: [{ projectId: 'BM289', estimatedTotalHours: 240, totalDeliverablesCount: 10, complexityTier: 'HIGH' }],
      }),
    };

    const mockCapacityService = {
      calculatePortfolioCapacity: jest.fn().mockResolvedValue({
        tenantId: tenantA,
        totalAvailableWeeklyCapacityHours: 500,
        totalAllocatedWeeklyCapacityHours: 480,
        overallUtilizationPercentage: 96.0,
        totalEngineersCount: 12,
        overloadedEngineersCount: 1,
        underutilizedEngineersCount: 0,
        engineers: [],
      }),
    };

    const mockBalancingService = {
      analyzeAndBalance: jest.fn().mockResolvedValue({
        tenantId: tenantA,
        overallHealthScore: 85,
        bottlenecks: [],
        recommendations: [],
      }),
    };

    const mockOutboxService = {
      append: jest.fn(async (eventType, aggregateType, aggregateId, payload, opts) => {
        const row: any = {
          id: `outbox-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          eventType,
          aggregateType,
          aggregateId,
          payload,
          tenantId: opts?.tenantId,
          createdBy: opts?.actorId,
          status: OutboxStatus.PENDING,
          attemptCount: 0,
          createdAt: new Date(),
        };
        inMemoryOutbox.push(row);
        return row;
      }),
      relay: jest.fn(async (maxRows, dispatch) => {
        let relayed = 0;
        let failed = 0;
        for (const row of inMemoryOutbox) {
          if (row.status === OutboxStatus.PENDING) {
            try {
              await dispatch(row);
              row.status = OutboxStatus.PUBLISHED;
              relayed++;
            } catch {
              row.status = OutboxStatus.FAILED;
              failed++;
            }
          }
        }
        return { relayed, failed };
      }),
      retryFailed: jest.fn().mockResolvedValue(0),
    };

    eventBus = new EngineeringEventBus();

    const mockAiHooks = {
      dispatchEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortfolioOrchestrationController],
      providers: [
        PortfolioSnapshotService,
        { provide: getRepositoryToken(EnterprisePortfolioSnapshot), useValue: mockSnapshotRepo },
        { provide: getRepositoryToken(CrossProjectAllocation), useValue: mockAllocationRepo },
        { provide: PortfolioDemandService, useValue: mockDemandService },
        { provide: PortfolioCapacityService, useValue: mockCapacityService },
        { provide: PortfolioBalancingService, useValue: mockBalancingService },
        { provide: PortfolioScenarioService, useValue: {} },
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: EngineeringEventBus, useValue: eventBus },
        { provide: EngineeringAiHooksService, useValue: mockAiHooks },
        EngineeringOutboxRelayService,
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PortfolioOrchestrationController>(PortfolioOrchestrationController);
    snapshotService = module.get<PortfolioSnapshotService>(PortfolioSnapshotService);
    relayService = module.get<EngineeringOutboxRelayService>(EngineeringOutboxRelayService);
  });

  describe('1. Full End-to-End Reactive Mutation Chain', () => {
    it('executes: Allocation Creation → DB Save → Outbox Append → Outbox Relay → EventBus → Authenticated SSE Stream', async () => {
      // Connect Tenant A client stream
      const reqA = { user: { tenantId: tenantA, userId: 'USER-ALPHA-1' } };
      const streamA$ = controller.streamPortfolioEvents(reqA);
      const receivedEventPromise = firstValueFrom(streamA$);

      // Step 1: Execute allocation creation mutation
      const created = await snapshotService.createAllocation(
        tenantA,
        {
          projectId: 'BM289',
          engineerId: 'ENG_TOOLING_01',
          engineerName: 'Karthik Raja',
          allocationRole: 'LEAD_DESIGNER',
          allocatedHoursPerWeek: 25,
          startDate: '2026-09-01',
          endDate: '2026-10-01',
          reviewRationale: 'Automotive program ramp-up',
        },
        'LEAD_PM_01',
      );

      expect(created.id).toBeDefined();
      expect(inMemoryAllocations.has(created.id)).toBe(true);

      // Step 2: Verify outbox record was appended
      expect(inMemoryOutbox.length).toBe(1);
      expect(inMemoryOutbox[0].eventType).toBe(EngineeringDomainEventType.PORTFOLIO_ALLOCATION_CREATED);
      expect(inMemoryOutbox[0].status).toBe(OutboxStatus.PENDING);

      // Step 3: Outbox relay executes
      const relayResult = await relayService.relay(10);
      expect(relayResult.relayed).toBe(1);
      expect(inMemoryOutbox[0].status).toBe(OutboxStatus.PUBLISHED);

      // Step 4: Verify client stream receives invalidation signal
      const receivedMsg = await receivedEventPromise;
      expect((receivedMsg.data as any)).toEqual({
        eventType: EngineeringDomainEventType.PORTFOLIO_ALLOCATION_CREATED,
        tenantId: tenantA,
        entityId: created.id,
        projectId: 'BM289',
        timestamp: expect.any(String),
      });
    });
  });

  describe('2. Multi-Tenant Strict Security & Isolation Boundary', () => {
    it('guarantees Tenant A receives ZERO events from Tenant B mutations', async () => {
      // Connect Tenant A and Tenant B streams
      const reqA = { user: { tenantId: tenantA, userId: 'USER-A' } };
      const reqB = { user: { tenantId: tenantB, userId: 'USER-B' } };

      const streamA$ = controller.streamPortfolioEvents(reqA);
      const streamB$ = controller.streamPortfolioEvents(reqB);

      let tenantAEventCount = 0;
      let tenantBEventCount = 0;

      const subA = streamA$.subscribe(() => tenantAEventCount++);
      const subB = streamB$.subscribe(() => tenantBEventCount++);

      // Mutate Tenant B allocation
      await snapshotService.createAllocation(
        tenantB,
        {
          projectId: 'BM331',
          engineerId: 'ENG_BETA_01',
          allocationRole: 'CAVITY_MODELER',
          allocatedHoursPerWeek: 15,
          startDate: '2026-09-01',
          endDate: '2026-10-01',
        },
        'USER-B',
      );

      // Relay outbox
      await relayService.relay(10);

      await new Promise((r) => setTimeout(r, 50));

      // Tenant B must receive 1 event, Tenant A must receive ZERO events
      expect(tenantBEventCount).toBe(1);
      expect(tenantAEventCount).toBe(0);

      subA.unsubscribe();
      subB.unsubscribe();
    });
  });

  describe('3. Snapshot Baseline Real-Time Notification', () => {
    it('relays snapshot creation event to authenticated tenant stream', async () => {
      const reqA = { user: { tenantId: tenantA, userId: 'USER-A' } };
      const streamA$ = controller.streamPortfolioEvents(reqA);
      const snapshotEventPromise = firstValueFrom(streamA$);

      const snapshot = await snapshotService.createSnapshot(tenantA, {
        snapshotName: 'Freeze Gate Q3',
        actorId: 'LEAD_PLANNER',
      });

      await relayService.relay(10);

      const msg = await snapshotEventPromise;
      expect((msg.data as any).eventType).toBe(EngineeringDomainEventType.PORTFOLIO_SNAPSHOT_CREATED);
      expect((msg.data as any).entityId).toBe(snapshot.id);
      expect((msg.data as any).tenantId).toBe(tenantA);
    });
  });
});
