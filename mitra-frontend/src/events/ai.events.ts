import { ChatMessage, AiResponse } from '../types/ai.types';

export type AiEventType =
  | 'ai:message'
  | 'ai:response'
  | 'ai:loading'
  | 'ai:error'
  | 'ai:clear'
  | 'ai:suggestion';

export interface AiEventPayload {
  message?: ChatMessage;
  response?: AiResponse;
  loading?: boolean;
  error?: string;
  suggestion?: string;
}

class AiEventBus {
  private listeners: Map<AiEventType, Set<(payload: AiEventPayload) => void>> = new Map();

  on(event: AiEventType, handler: (payload: AiEventPayload) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: AiEventType, handler: (payload: AiEventPayload) => void): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: AiEventType, payload: AiEventPayload = {}): void {
    this.listeners.get(event)?.forEach(handler => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`AI event handler error (${event}):`, err);
      }
    });
  }
}

export const aiEvents = new AiEventBus();
