import { RobotEmotion, RobotLEDConfig } from '../../types/robot.types';

export const emotionColorMap: Record<RobotEmotion, RobotLEDConfig> = {
  neutral: { core: '#00B4D8', eyes: '#64FFDA', chest: '#00B4D8', intensity: 1.0 },
  happy: { core: '#64FFDA', eyes: '#64FFDA', chest: '#64FFDA', intensity: 1.4 },
  excited: { core: '#F472B6', eyes: '#F472B6', chest: '#F472B6', intensity: 1.8 },
  concerned: { core: '#FBBF24', eyes: '#FBBF24', chest: '#FBBF24', intensity: 1.2 },
  warning: { core: '#F59E0B', eyes: '#F59E0B', chest: '#F59E0B', intensity: 1.6 },
  danger: { core: '#EF4444', eyes: '#EF4444', chest: '#EF4444', intensity: 2.0 },
  thinking: { core: '#A78BFA', eyes: '#A78BFA', chest: '#A78BFA', intensity: 1.3 },
  sleepy: { core: '#475569', eyes: '#64748B', chest: '#475569', intensity: 0.5 },
  success: { core: '#2ECC71', eyes: '#2ECC71', chest: '#2ECC71', intensity: 1.6 },
};

export function detectEmotion(text: string): RobotEmotion {
  const t = text.toLowerCase();
  if (t.includes('error') || t.includes('critical') || t.includes('failure') || t.includes('failed')) {
    return 'danger';
  }
  if (t.includes('success') || t.includes('completed') || t.includes('resolved') || t.includes('done')) {
    return 'success';
  }
  if (t.includes('delay') || t.includes('risk') || t.includes('warning') || t.includes('overdue')) {
    return 'warning';
  }
  if (t.includes('hello') || t.includes('welcome') || t.includes('great') || t.includes('excellent')) {
    return 'happy';
  }
  if (t.includes('analyzing') || t.includes('processing') || t.includes('thinking')) {
    return 'thinking';
  }
  return 'neutral';
}

export function getLEDForEmotion(emotion: RobotEmotion): RobotLEDConfig {
  return emotionColorMap[emotion] ?? emotionColorMap.neutral;
}
