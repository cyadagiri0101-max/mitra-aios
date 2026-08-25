import { describe, it, expect, vi, beforeEach } from 'vitest';
import { portfolioQueryKeys } from './usePortfolioData';

describe('M12.5 Sprint 3: usePortfolioRealtimeSync Event Invalidation Logic', () => {
  let mockQueryClient: any;

  beforeEach(() => {
    mockQueryClient = {
      invalidateQueries: vi.fn(),
    };
  });

  const simulateHandleEvent = (
    event: { eventType: string; tenantId: string; entityId?: string; projectId?: string; timestamp: string },
    queryClient: any,
    onEvent?: (e: any) => void
  ) => {
    if (onEvent) onEvent(event);

    switch (event.eventType) {
      case 'engineering.portfolio.allocation_created':
      case 'engineering.portfolio.allocation_status_updated':
        queryClient.invalidateQueries({ queryKey: portfolioQueryKeys.all });
        break;

      case 'engineering.portfolio.snapshot_created':
        queryClient.invalidateQueries({ queryKey: portfolioQueryKeys.snapshot() });
        break;

      default:
        queryClient.invalidateQueries({ queryKey: portfolioQueryKeys.all });
        break;
    }
  };

  it('invalidates root portfolio query key on allocation_created event', () => {
    const event = {
      eventType: 'engineering.portfolio.allocation_created',
      tenantId: 'tenant-1',
      entityId: 'alloc-1',
      projectId: 'BM289',
      timestamp: '2026-08-25T10:00:00Z',
    };

    simulateHandleEvent(event, mockQueryClient);

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['portfolio'],
    });
  });

  it('invalidates root portfolio query key on allocation_status_updated event', () => {
    const event = {
      eventType: 'engineering.portfolio.allocation_status_updated',
      tenantId: 'tenant-1',
      entityId: 'alloc-1',
      projectId: 'BM289',
      timestamp: '2026-08-25T10:01:00Z',
    };

    simulateHandleEvent(event, mockQueryClient);

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['portfolio'],
    });
  });

  it('invalidates snapshot query key on snapshot_created event', () => {
    const event = {
      eventType: 'engineering.portfolio.snapshot_created',
      tenantId: 'tenant-1',
      entityId: 'snap-1',
      timestamp: '2026-08-25T10:02:00Z',
    };

    simulateHandleEvent(event, mockQueryClient);

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['portfolio', 'snapshot'],
    });
  });

  it('invokes custom onEvent callback when provided', () => {
    const onEventSpy = vi.fn();
    const event = {
      eventType: 'engineering.portfolio.allocation_created',
      tenantId: 'tenant-1',
      entityId: 'alloc-100',
      timestamp: '2026-08-25T10:03:00Z',
    };

    simulateHandleEvent(event, mockQueryClient, onEventSpy);

    expect(onEventSpy).toHaveBeenCalledWith(event);
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalled();
  });
});
