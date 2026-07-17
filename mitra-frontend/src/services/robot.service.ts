import { robotEvents } from '../events/robot.events';
import { RobotState, RobotEmotion, RobotGesture } from '../types/robot.types';

export function transitionRobotState(state: RobotState, payload?: Record<string, unknown>): void {
  robotEvents.emit('robot:stateChange', { state, ...(payload ?? {}) });
}

export function setRobotEmotion(emotion: RobotEmotion): void {
  robotEvents.emit('robot:emotionChange', { emotion });
}

export function triggerRobotGesture(gesture: RobotGesture): void {
  robotEvents.emit('robot:gesture', { gesture });
}

export function robotSpeak(text: string): void {
  robotEvents.emit('robot:speakStart', { text });
}

export function robotStopSpeaking(): void {
  robotEvents.emit('robot:speakEnd', {});
}

export function robotListen(): void {
  robotEvents.emit('robot:listenStart', {});
}

export function robotStopListening(): void {
  robotEvents.emit('robot:listenEnd', {});
}

export function robotDock(docked = true): void {
  robotEvents.emit(docked ? 'robot:dock' : 'robot:undock', { docked });
}

export function robotAlert(text?: string): void {
  robotEvents.emit('robot:alert', { text });
}
