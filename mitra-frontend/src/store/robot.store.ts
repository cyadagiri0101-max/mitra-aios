import { create } from 'zustand';
import { RobotState, RobotEmotion, RobotGesture, RobotContext } from '../types/robot.types';

interface RobotStore extends RobotContext {
  setState: (state: RobotState) => void;
  setEmotion: (emotion: RobotEmotion) => void;
  setGesture: (gesture: RobotGesture) => void;
  setSpeaking: (speaking: boolean) => void;
  setListening: (listening: boolean) => void;
  setTranscript: (transcript: string) => void;
  setLastResponse: (lastResponse: string) => void;
  setDocked: (docked: boolean) => void;
  setEyeTarget: (target: [number, number, number]) => void;
  setConfig: (config: Partial<RobotContext['config']>) => void;
  reset: () => void;
}

const defaultContext: RobotContext = {
  state: 'idle',
  emotion: 'neutral',
  gesture: 'idle',
  speaking: false,
  listening: false,
  transcript: '',
  lastResponse: '',
  eyeTracking: { target: [0, 0, 5], enabled: true },
  led: { core: '#00B4D8', eyes: '#64FFDA', chest: '#00B4D8', intensity: 1.0 },
  physics: { floatSpeed: 1.5, floatAmplitude: 0.08, docked: true },
  config: {
    autoGreet: true,
    voiceEnabled: true,
    speechRecognitionEnabled: true,
    lipSyncEnabled: true,
    eyeTrackingEnabled: true,
    particleEffectsEnabled: true,
  },
};

export const useRobotStore = create<RobotStore>((set) => ({
  ...defaultContext,
  setState: (state) => set({ state }),
  setEmotion: (emotion) => set({ emotion }),
  setGesture: (gesture) => set({ gesture }),
  setSpeaking: (speaking) => set({ speaking }),
  setListening: (listening) => set({ listening }),
  setTranscript: (transcript) => set({ transcript }),
  setLastResponse: (lastResponse) => set({ lastResponse }),
  setDocked: (docked) => set((s) => ({ physics: { ...s.physics, docked } })),
  setEyeTarget: (target) => set((s) => ({ eyeTracking: { ...s.eyeTracking, target } })),
  setConfig: (config) => set((s) => ({ config: { ...s.config, ...config } })),
  reset: () => set(defaultContext),
}));
