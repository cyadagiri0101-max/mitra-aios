import { createMachine, assign, fromPromise } from 'xstate';
import { RobotState, RobotEmotion, RobotGesture } from '../../types/robot.types';

interface RobotMachineContext {
  state: RobotState;
  emotion: RobotEmotion;
  gesture: RobotGesture;
  transcript: string;
  response: string;
  docked: boolean;
  listening: boolean;
}

export type RobotMachineEvent =
  | { type: 'GREET' }
  | { type: 'LISTEN' }
  | { type: 'TRANSCRIPT'; value: string }
  | { type: 'THINK' }
  | { type: 'SEARCH' }
  | { type: 'SPEAK'; value: string }
  | { type: 'EXPLAIN' }
  | { type: 'PRESENT' }
  | { type: 'DONE' }
  | { type: 'ALERT'; value?: string }
  | { type: 'WARN'; value?: string }
  | { type: 'SLEEP' }
  | { type: 'WAKE' }
  | { type: 'DOCK' }
  | { type: 'UNDOCK' }
  | { type: 'GESTURE'; value: RobotGesture }
  | { type: 'EMOTION'; value: RobotEmotion };

const emotionFromText = (text: string): RobotEmotion => {
  const t = text.toLowerCase();
  if (t.includes('error') || t.includes('fail') || t.includes('critical')) return 'danger';
  if (t.includes('success') || t.includes('complete') || t.includes('resolved')) return 'success';
  if (t.includes('delay') || t.includes('risk') || t.includes('warning')) return 'warning';
  if (t.includes('hello') || t.includes('welcome') || t.includes('great')) return 'happy';
  return 'neutral';
};

const gestureFromText = (text: string): RobotGesture => {
  const t = text.toLowerCase();
  if (t.includes('look') || t.includes('show') || t.includes('here')) return 'point';
  if (t.includes('hello') || t.includes('welcome') || t.includes('hi ')) return 'wave';
  if (t.includes('analyze') || t.includes('think') || t.includes('processing')) return 'think';
  if (t.includes('present') || t.includes('display')) return 'present';
  if (t.includes('scan')) return 'scan';
  return 'idle';
};

export const robotMachine = createMachine(
  {
    id: 'robot',
    initial: 'idle',
    context: {
      state: 'idle',
      emotion: 'neutral',
      gesture: 'idle',
      transcript: '',
      response: '',
      docked: true,
      listening: false,
    } as RobotMachineContext,
    states: {
      idle: {
        entry: assign({ state: 'idle', gesture: 'idle', listening: false }),
        on: {
          GREET: { target: 'greeting' },
          LISTEN: { target: 'listening' },
          ALERT: { target: 'alert' },
          WARN: { target: 'warning' },
          SLEEP: { target: 'sleep' },
          DOCK: { actions: assign({ docked: true }) },
          UNDOCK: { actions: assign({ docked: false }) },
        },
      },
      greeting: {
        entry: assign({ state: 'greeting', emotion: 'happy', gesture: 'wave' }),
        on: { DONE: { target: 'idle' }, LISTEN: { target: 'listening' } },
      },
      listening: {
        entry: assign({ state: 'listening', listening: true, gesture: 'scan' }),
        on: {
          TRANSCRIPT: { actions: assign({ transcript: ({ event }) => event.value }) },
          THINK: { target: 'thinking' },
          SEARCH: { target: 'searching' },
          DONE: { target: 'idle' },
        },
      },
      thinking: {
        entry: assign({ state: 'thinking', emotion: 'thinking', gesture: 'think' }),
        on: {
          SPEAK: { target: 'speaking', actions: assign({ response: ({ event }) => event.value }) },
          EXPLAIN: { target: 'explaining' },
          ALERT: { target: 'alert' },
        },
      },
      searching: {
        entry: assign({ state: 'searching', emotion: 'thinking', gesture: 'scan' }),
        on: {
          SPEAK: { target: 'speaking', actions: assign({ response: ({ event }) => event.value }) },
          EXPLAIN: { target: 'explaining' },
        },
      },
      explaining: {
        entry: assign({ state: 'explaining', gesture: 'present' }),
        on: {
          SPEAK: { target: 'speaking', actions: assign({ response: ({ event }) => event.value }) },
          DONE: { target: 'idle' },
        },
      },
      speaking: {
        entry: assign({
          state: 'speaking',
          emotion: ({ context, event }) =>
            event.type === 'SPEAK' ? emotionFromText(event.value) : context.emotion,
          gesture: ({ context, event }) =>
            event.type === 'SPEAK' ? gestureFromText(event.value) : context.gesture,
        }),
        on: { DONE: { target: 'success' }, LISTEN: { target: 'listening' } },
      },
      presenting: {
        entry: assign({ state: 'presenting', gesture: 'present' }),
        on: { DONE: { target: 'idle' }, SPEAK: { target: 'speaking' } },
      },
      success: {
        entry: assign({ state: 'success', emotion: 'success', gesture: 'celebrate' }),
        on: { DONE: { target: 'idle' } },
      },
      alert: {
        entry: assign({ state: 'alert', emotion: 'danger', gesture: 'alert' }),
        on: { DONE: { target: 'idle' }, WAKE: { target: 'idle' } },
      },
      warning: {
        entry: assign({ state: 'warning', emotion: 'warning', gesture: 'alert' }),
        on: { DONE: { target: 'idle' }, WAKE: { target: 'idle' } },
      },
      sleep: {
        entry: assign({ state: 'sleep', emotion: 'sleepy', gesture: 'idle' }),
        on: { WAKE: { target: 'idle' }, GREET: { target: 'greeting' } },
      },
    },
    on: {
      GESTURE: { actions: assign({ gesture: ({ event }) => event.value }) },
      EMOTION: { actions: assign({ emotion: ({ event }) => event.value }) },
      DOCK: { actions: assign({ docked: true }) },
      UNDOCK: { actions: assign({ docked: false }) },
    },
  },
  {
    actions: {},
    actors: {
      speakComplete: fromPromise(async () => {
        // Duration handled by voice service; this actor is a placeholder for async transitions.
        await new Promise(resolve => setTimeout(resolve, 100));
      }),
    },
  }
);
