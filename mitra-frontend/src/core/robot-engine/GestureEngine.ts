import { RobotGesture } from '../../types/robot.types';

export function planGesture(text: string): RobotGesture {
  const t = text.toLowerCase();
  if (t.includes('hello') || t.includes('hi') || t.includes('welcome') || t.includes('morning')) return 'wave';
  if (t.includes('look') || t.includes('show') || t.includes('here') || t.includes('display')) return 'point';
  if (t.includes('analyze') || t.includes('think') || t.includes('processing') || t.includes('search')) return 'think';
  if (t.includes('present') || t.includes('explain') || t.includes('overview')) return 'present';
  if (t.includes('scan') || t.includes('searching') || t.includes('listen')) return 'scan';
  if (t.includes('alert') || t.includes('warning') || t.includes('attention')) return 'alert';
  if (t.includes('success') || t.includes('done') || t.includes('complete')) return 'celebrate';
  return 'idle';
}

export function gestureDuration(gesture: RobotGesture): number {
  switch (gesture) {
    case 'wave': return 2500;
    case 'celebrate': return 2000;
    case 'point': return 1500;
    case 'think': return 1200;
    case 'present': return 1800;
    case 'alert': return 2000;
    default: return 1000;
  }
}
