/**
 * MITRA Engineering Intelligence Platform
 * M12.5 Sprint 3 — Real-Time Portfolio Intelligence & Live Invalidation
 * SSE / Stream-Driven Query Invalidation Hook for Portfolio Control Tower
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { portfolioQueryKeys } from './usePortfolioData';
import { getAccessToken } from '../utils/api';

export interface PortfolioRealtimeEvent {
  eventType: string;
  tenantId: string;
  entityId?: string;
  projectId?: string;
  timestamp: string;
}

export interface UsePortfolioRealtimeSyncOptions {
  enabled?: boolean;
  onEvent?: (event: PortfolioRealtimeEvent) => void;
}

export function usePortfolioRealtimeSync(options: UsePortfolioRealtimeSyncOptions = {}) {
  const { enabled = true, onEvent } = options;
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<PortfolioRealtimeEvent | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const handleEvent = useCallback(
    (event: PortfolioRealtimeEvent) => {
      setLastEvent(event);
      if (onEvent) {
        onEvent(event);
      }

      // Targeted React Query invalidation based on event type
      switch (event.eventType) {
        case 'engineering.portfolio.allocation_created':
        case 'engineering.portfolio.allocation_status_updated':
          // Invalidate all related portfolio metrics & allocations
          queryClient.invalidateQueries({ queryKey: portfolioQueryKeys.all });
          break;

        case 'engineering.portfolio.snapshot_created':
          // Invalidate snapshot query
          queryClient.invalidateQueries({ queryKey: portfolioQueryKeys.snapshot() });
          break;

        default:
          queryClient.invalidateQueries({ queryKey: portfolioQueryKeys.all });
          break;
      }
    },
    [queryClient, onEvent]
  );

  const connect = useCallback(() => {
    if (!enabled) return;

    const token = getAccessToken();
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    const sseUrl = `${apiUrl}/engineering/portfolio/events`;

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    fetch(sseUrl, { headers, signal })
      .then(async (response) => {
        if (!response.ok || !response.body) {
          throw new Error(`SSE connection failed with status: ${response.status}`);
        }

        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const message = line.trim();
            if (message.startsWith('data:')) {
              try {
                const dataRaw = message.slice(5).trim();
                const event: PortfolioRealtimeEvent = JSON.parse(dataRaw);
                handleEvent(event);
              } catch {
                // Ignore non-JSON heartbeat or malformed frames
              }
            }
          }
        }
      })
      .catch(() => {
        if (signal.aborted) return;
        setIsConnected(false);

        // Exponential backoff reconnect: 1s, 2s, 4s, up to 10s
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10_000);
        reconnectAttemptsRef.current += 1;

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      });
  }, [enabled, handleEvent]);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      setIsConnected(false);
    };
  }, [enabled, connect]);

  return {
    isConnected,
    lastEvent,
    handleEvent, // Exposed for testing & manual dispatch
  };
}
