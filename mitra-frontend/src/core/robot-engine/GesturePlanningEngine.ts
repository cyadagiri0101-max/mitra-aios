import { RobotGesture } from '../../types/robot.types';

export interface GestureContext {
  userMessage: string;
  aiResponse: string;
  emotion: string;
  confidence: number;
}

export interface GesturePlan {
  gesture: RobotGesture;
  intensity: number;
  duration: number;
  startTime: number;
}

export class GesturePlanningEngine {
  private gestureSequenceMap: Record<string, RobotGesture[]> = {
    greeting: ['wave', 'nod'],
    explanation: ['point', 'present'],
    agreement: ['nod', 'celebrate'],
    disagreement: ['shake'],
    uncertainty: ['think'],
    success: ['celebrate', 'wave'],
    warning: ['alert'],
    error: ['alert', 'shake'],
    thinking: ['think'],
    presenting: ['present', 'point'],
    listening: ['scan'],
  };

  private emotionGestureModifiers: Record<string, RobotGesture[]> = {
    happy: ['celebrate', 'wave'],
    excited: ['celebrate', 'wave'],
    concerned: ['think'],
    thinking: ['think'],
    warning: ['alert'],
    danger: ['alert'],
  };

  // Generate gesture based on text analysis and emotion
  planGesture(context: GestureContext): GesturePlan {
    const intent = this.extractIntent(context.userMessage, context.aiResponse);
    const baseGestures = this.gestureSequenceMap[intent] || ['idle'];
    const emotionGestures = this.emotionGestureModifiers[context.emotion] || [];

    // Blend intent and emotion gestures
    const selectedGesture = this.selectOptimalGesture(baseGestures, emotionGestures, context.emotion);
    const intensity = this.calculateIntensity(context);
    const duration = this.estimateDuration(selectedGesture, context);

    return {
      gesture: selectedGesture,
      intensity,
      duration,
      startTime: Date.now(),
    };
  }

  private extractIntent(userMessage: string, aiResponse: string): string {
    const combined = `${userMessage} ${aiResponse}`.toLowerCase();

    // Keyword-based intent detection
    if (
      combined.includes('hello') ||
      combined.includes('hi') ||
      combined.includes('welcome') ||
      combined.includes('greet')
    ) {
      return 'greeting';
    }

    if (
      combined.includes('explain') ||
      combined.includes('describe') ||
      combined.includes('detail') ||
      combined.includes('show') ||
      combined.includes('demonstrate')
    ) {
      return 'explanation';
    }

    if (
      combined.includes('yes') ||
      combined.includes('agree') ||
      combined.includes('correct') ||
      combined.includes('right') ||
      combined.includes('exactly')
    ) {
      return 'agreement';
    }

    if (
      combined.includes('no') ||
      combined.includes('disagree') ||
      combined.includes('wrong') ||
      combined.includes('incorrect')
    ) {
      return 'disagreement';
    }

    if (
      combined.includes('maybe') ||
      combined.includes('perhaps') ||
      combined.includes('possible') ||
      combined.includes('unclear') ||
      combined.includes('uncertain')
    ) {
      return 'uncertainty';
    }

    if (
      combined.includes('success') ||
      combined.includes('completed') ||
      combined.includes('done') ||
      combined.includes('accomplished') ||
      combined.includes('excellent')
    ) {
      return 'success';
    }

    if (
      combined.includes('warning') ||
      combined.includes('caution') ||
      combined.includes('careful') ||
      combined.includes('risk')
    ) {
      return 'warning';
    }

    if (
      combined.includes('error') ||
      combined.includes('failed') ||
      combined.includes('problem') ||
      combined.includes('critical') ||
      combined.includes('issue')
    ) {
      return 'error';
    }

    if (
      combined.includes('think') ||
      combined.includes('consider') ||
      combined.includes('analyze') ||
      combined.includes('processing') ||
      combined.includes('calculating')
    ) {
      return 'thinking';
    }

    if (combined.includes('present') || combined.includes('show')) {
      return 'presenting';
    }

    if (combined.includes('listen') || combined.includes('hear')) {
      return 'listening';
    }

    return 'thinking'; // Default safe state
  }

  private selectOptimalGesture(
    baseGestures: RobotGesture[],
    emotionGestures: RobotGesture[],
    emotion: string,
  ): RobotGesture {
    // Prioritize emotion-based gestures for strong emotions
    const strongEmotions = ['danger', 'excited', 'happy'];
    if (strongEmotions.includes(emotion) && emotionGestures.length > 0) {
      return emotionGestures[0];
    }

    // Otherwise use intent-based gesture
    return baseGestures[0] || 'idle';
  }

  private calculateIntensity(context: GestureContext): number {
    // Intensity based on confidence and emotion strength
    const baseIntensity = context.confidence;
    const emotionIntensities: Record<string, number> = {
      excited: 0.9,
      happy: 0.7,
      danger: 0.95,
      warning: 0.8,
      thinking: 0.4,
      neutral: 0.5,
    };

    const emotionIntensity = emotionIntensities[context.emotion] || 0.5;
    return Math.min((baseIntensity + emotionIntensity) / 2, 1.0);
  }

  private estimateDuration(gesture: RobotGesture, context: GestureContext): number {
    // Duration based on gesture type and message length
    const baseDurations: Record<RobotGesture, number> = {
      wave: 0.8,
      point: 1.2,
      nod: 0.6,
      shake: 0.6,
      think: 1.5,
      present: 1.8,
      celebrate: 1.2,
      alert: 0.9,
      scan: 1.0,
      idle: 2.0,
    };

    const baseDuration = baseDurations[gesture] || 1.0;
    const messageLengthFactor = Math.min(context.aiResponse.length / 200, 2.0);

    return baseDuration * messageLengthFactor;
  }

  // Generate sequence of gestures for longer responses
  planGestureSequence(context: GestureContext, maxGestures: number = 3): GesturePlan[] {
    const plan = this.planGesture(context);

    if (maxGestures <= 1 || context.aiResponse.length < 100) {
      return [plan];
    }

    const sequence: GesturePlan[] = [plan];
    let currentTime = plan.startTime + plan.duration * 1000;

    // Add secondary gestures for very long responses
    if (context.aiResponse.length > 300) {
      const secondaryIntent = this.extractSecondaryIntent(context.aiResponse);
      const secondaryGesture = this.gestureSequenceMap[secondaryIntent]?.[1] || 'idle';

      sequence.push({
        gesture: secondaryGesture,
        intensity: plan.intensity * 0.7,
        duration: 1.0,
        startTime: currentTime,
      });

      currentTime += 1000;

      if (maxGestures > 2 && context.aiResponse.length > 500) {
        sequence.push({
          gesture: 'present',
          intensity: plan.intensity * 0.6,
          duration: 0.8,
          startTime: currentTime,
        });
      }
    }

    return sequence;
  }

  private extractSecondaryIntent(text: string): string {
    // Look for secondary keywords that indicate a shift in topic
    if (text.includes('however') || text.includes('but') || text.includes('additionally')) {
      return 'uncertainty';
    }

    if (text.includes('finally') || text.includes('summary') || text.includes('conclusion')) {
      return 'success';
    }

    return 'thinking';
  }
}

export const gesturePlanningEngine = new GesturePlanningEngine();
