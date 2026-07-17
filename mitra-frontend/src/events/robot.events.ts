import { RobotState, RobotEmotion, RobotGesture } from '../types/robot.types';

export type RobotEventType =
  | 'robot:stateChange'
  | 'robot:emotionChange'
  | 'robot:gesture'
  | 'robot:speakStart'
  | 'robot:speakEnd'
  | 'robot:listenStart'
  | 'robot:listenEnd'
  | 'robot:dock'
  | 'robot:undock'
  | 'robot:alert'
  | 'robot:click'
  | 'robot:phonemesReady'
  | 'robot:emotionAnalysis'
  | 'robot:gesturePlan';

export interface RobotEventPayload {
  state?: RobotState;
  emotion?: RobotEmotion;
  gesture?: RobotGesture;
  text?: string;
  docked?: boolean;
  phonemes?: any[];
  duration?: number;
  voiceTone?: string;
  confidence?: number;
  gestures?: RobotGesture[];
  [key: string]: any;
}

class RobotEventBus {
  private listeners: Map<RobotEventType, Set<(payload: RobotEventPayload) => void>> = new Map();

  on(event: RobotEventType, handler: (payload: RobotEventPayload) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: RobotEventType, handler: (payload: RobotEventPayload) => void): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: RobotEventType, payload: RobotEventPayload = {}): void {
    this.listeners.get(event)?.forEach(handler => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`Robot event handler error (${event}):`, err);
      }
    });
  }

  once(event: RobotEventType, handler: (payload: RobotEventPayload) => void): () => void {
    const unsubscribe = this.on(event, payload => {
      unsubscribe();
      handler(payload);
    });
    return unsubscribe;
  }
}

export const robotEvents = new RobotEventBus();
