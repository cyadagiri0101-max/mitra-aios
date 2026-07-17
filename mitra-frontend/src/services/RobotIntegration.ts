import { PhonemeData } from '../core/robot-engine/PhonemeEngine';
import { RobotEmotion } from '../types/robot.types';
import { robotEvents } from '../events/robot.events';

export interface TTSWithPhonemes {
  text: string;
  audioUrl: string;
  phonemes: PhonemeData[];
  duration: number;
}

export interface EmotionAnalysisRequest {
  text: string;
  voiceTone?: 'positive' | 'negative' | 'neutral' | 'excited' | 'concerned';
  confidence?: number;
}

export interface RobotGestureRequest {
  userMessage: string;
  aiResponse: string;
  emotion: RobotEmotion;
  gestures?: string[];
}

/**
 * Handle TTS with phoneme data from backend
 * Example backend response:
 * {
 *   text: "Hello world",
 *   audioUrl: "https://api.example.com/speech/abc123.mp3",
 *   phonemes: [
 *     { phoneme: "A", time: 0.12, duration: 0.1, confidence: 0.95 },
 *     { phoneme: "O", time: 0.22, duration: 0.15, confidence: 0.93 }
 *   ],
 *   duration: 2.5
 * }
 */
export async function handleTTSWithPhonemes(ttsData: TTSWithPhonemes, audioElement: HTMLAudioElement): Promise<void> {
  // Update audio source
  audioElement.src = ttsData.audioUrl;
  audioElement.currentTime = 0;

  // Queue phonemes for lip sync
  robotEvents.emit('robot:phonemesReady', {
    phonemes: ttsData.phonemes,
    duration: ttsData.duration,
  });

  // Play audio
  try {
    await audioElement.play();
    robotEvents.emit('robot:speakStart');

    // Wait for audio to finish
    await new Promise<void>((resolve) => {
      const onEnded = () => {
        audioElement.removeEventListener('ended', onEnded);
        resolve();
      };
      audioElement.addEventListener('ended', onEnded);
    });

    robotEvents.emit('robot:speakEnd');
  } catch (error) {
    console.error('Error playing TTS audio:', error);
    robotEvents.emit('robot:speakEnd');
  }
}

/**
 * Handle emotion detection from backend
 */
export function handleEmotionAnalysis(analysis: EmotionAnalysisRequest): void {
  // Backend can provide emotion guidance based on text content and voice tone
  robotEvents.emit('robot:emotionAnalysis', analysis);
}

/**
 * Handle gesture planning from backend
 */
export function handleGesturePlanning(request: RobotGestureRequest): void {
  robotEvents.emit('robot:gesturePlan', request as any);
}

/**
 * Format audio frequency data for backend emotion analysis
 */
export function formatAudioFeaturesForBackend(frequencyData: Uint8Array, timeDomainData?: Uint8Array) {
  const features = {
    frequency: Array.from(frequencyData),
    timeDomain: timeDomainData ? Array.from(timeDomainData) : undefined,
    timestamp: Date.now(),
  };

  return features;
}

/**
 * Create a request to get TTS with phonemes from backend
 */
export async function requestTTSWithPhonemes(
  text: string,
  apiEndpoint: string,
  options?: { language?: string; speaker?: string; format?: string },
): Promise<TTSWithPhonemes | null> {
  try {
    const response = await fetch(`${apiEndpoint}/tts/with-phonemes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        language: options?.language || 'en',
        speaker: options?.speaker || 'default',
        format: options?.format || 'mp3',
        includePhonemes: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS request failed: ${response.statusText}`);
    }

    const data: TTSWithPhonemes = await response.json();
    return data;
  } catch (error) {
    console.error('Error requesting TTS with phonemes:', error);
    return null;
  }
}

/**
 * Send real-time audio analysis to backend for emotion detection
 */
export async function sendAudioAnalysisToBackend(
  frequencyData: Uint8Array,
  apiEndpoint: string,
  sessionId?: string,
): Promise<EmotionAnalysisRequest | null> {
  try {
    const features = formatAudioFeaturesForBackend(frequencyData);

    const response = await fetch(`${apiEndpoint}/ai/analyze-emotion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...features,
        sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Analysis request failed: ${response.statusText}`);
    }

    const analysis: EmotionAnalysisRequest = await response.json();
    return analysis;
  } catch (error) {
    console.error('Error sending audio analysis:', error);
    return null;
  }
}

/**
 * Request gesture planning from AI backend
 */
export async function requestGesturePlan(
  userMessage: string,
  aiResponse: string,
  emotion: RobotEmotion,
  apiEndpoint: string,
): Promise<RobotGestureRequest | null> {
  try {
    const response = await fetch(`${apiEndpoint}/ai/plan-gesture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userMessage,
        aiResponse,
        emotion,
        includeSequence: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Gesture planning failed: ${response.statusText}`);
    }

    const plan: RobotGestureRequest = await response.json();
    return plan;
  } catch (error) {
    console.error('Error requesting gesture plan:', error);
    return null;
  }
}

/**
 * Batch process multiple requests for efficiency
 */
export async function batchProcessRobotRequests(
  requests: Array<{
    type: 'tts' | 'emotion' | 'gesture';
    payload: any;
  }>,
  apiEndpoint: string,
): Promise<any[]> {
  try {
    const response = await fetch(`${apiEndpoint}/ai/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests,
      }),
    });

    if (!response.ok) {
      throw new Error(`Batch request failed: ${response.statusText}`);
    }

    const results = await response.json();
    return results;
  } catch (error) {
    console.error('Error processing batch request:', error);
    return [];
  }
}
