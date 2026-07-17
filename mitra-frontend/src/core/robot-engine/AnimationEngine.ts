import { RobotState, RobotGesture, RobotPhysics } from '../../types/robot.types';

export interface AnimationFrame {
  time: number;
  floatOffset: number;
  headTilt: number;
  armRaise: number;
  corePulse: number;
  ringRotation: number;
}

export function computeAnimationFrame(
  state: RobotState,
  gesture: RobotGesture,
  physics: RobotPhysics,
  elapsedMs: number
): AnimationFrame {
  const t = elapsedMs / 1000;
  const speed = physics.floatSpeed;

  let floatOffset = Math.sin(t * speed) * physics.floatAmplitude;
  let headTilt = Math.sin(t * 0.7) * 0.05;
  let armRaise = 0;
  let corePulse = 1 + Math.sin(t * 2) * 0.05;
  let ringRotation = t * 0.3;

  switch (state) {
    case 'listening':
      headTilt = Math.sin(t * 3) * 0.12;
      corePulse = 1 + Math.sin(t * 6) * 0.15;
      break;
    case 'thinking':
    case 'searching':
      ringRotation = t * 1.5;
      corePulse = 1 + Math.sin(t * 4) * 0.2;
      headTilt = Math.sin(t * 1.2) * 0.08;
      break;
    case 'speaking':
      corePulse = 1 + Math.sin(t * 8) * 0.1;
      break;
    case 'alert':
    case 'warning':
      corePulse = 1 + Math.sin(t * 10) * 0.25;
      break;
    case 'sleep':
      floatOffset = Math.sin(t * 0.5) * (physics.floatAmplitude * 0.3);
      corePulse = 1 + Math.sin(t * 0.8) * 0.05;
      break;
  }

  switch (gesture) {
    case 'wave':
      armRaise = Math.sin(t * 8) * 0.8 + 0.2;
      break;
    case 'point':
      armRaise = 0.9;
      break;
    case 'think':
      armRaise = Math.sin(t * 1.5) * 0.2 + 0.7;
      break;
    case 'present':
      armRaise = 0.6;
      break;
    case 'alert':
      armRaise = Math.sin(t * 6) * 0.3 + 0.4;
      break;
    case 'celebrate':
      armRaise = Math.sin(t * 10) * 0.5 + 0.8;
      floatOffset = Math.sin(t * 6) * (physics.floatAmplitude * 1.5);
      break;
    case 'scan':
      headTilt = Math.sin(t * 2) * 0.2;
      ringRotation = t * 0.8;
      break;
  }

  return { time: t, floatOffset, headTilt, armRaise, corePulse, ringRotation };
}
