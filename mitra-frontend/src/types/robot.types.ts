export type RobotState =
  | 'idle'
  | 'greeting'
  | 'listening'
  | 'thinking'
  | 'searching'
  | 'explaining'
  | 'speaking'
  | 'presenting'
  | 'success'
  | 'alert'
  | 'warning'
  | 'sleep';

export type RobotEmotion =
  | 'neutral'
  | 'happy'
  | 'excited'
  | 'concerned'
  | 'warning'
  | 'danger'
  | 'thinking'
  | 'sleepy'
  | 'success';

export type RobotGesture =
  | 'idle'
  | 'wave'
  | 'point'
  | 'nod'
  | 'shake'
  | 'think'
  | 'present'
  | 'scan'
  | 'alert'
  | 'celebrate';

export interface RobotEyeTracking {
  target: [number, number, number];
  enabled: boolean;
}

export interface RobotLEDConfig {
  core: string;
  eyes: string;
  chest: string;
  intensity: number;
}

export interface RobotPhysics {
  floatSpeed: number;
  floatAmplitude: number;
  docked: boolean;
}

export interface RobotConfig {
  autoGreet: boolean;
  voiceEnabled: boolean;
  speechRecognitionEnabled: boolean;
  lipSyncEnabled: boolean;
  eyeTrackingEnabled: boolean;
  particleEffectsEnabled: boolean;
}

export interface RobotContext {
  state: RobotState;
  emotion: RobotEmotion;
  gesture: RobotGesture;
  speaking: boolean;
  listening: boolean;
  transcript: string;
  lastResponse: string;
  eyeTracking: RobotEyeTracking;
  led: RobotLEDConfig;
  physics: RobotPhysics;
  config: RobotConfig;
}
