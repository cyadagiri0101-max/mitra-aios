import * as THREE from 'three';
import { RobotEmotion } from '../../types/robot.types';

export type Phoneme = 'A' | 'E' | 'I' | 'O' | 'U' | 'M' | 'F' | 'V' | 'TH' | 'L' | 'R' | 'S' | 'Z' | 'SILENT';

export interface Viseme {
  phoneme: Phoneme;
  morphTargetIndex: number;
  intensity: number;
}

export interface PhonemeData {
  phoneme: Phoneme;
  time: number;
  duration: number;
  confidence: number;
}

export const PHONEME_TO_VISEME_MAP: Record<Phoneme, string> = {
  A: 'viseme_A',      // mouth open wide (A, O sounds)
  E: 'viseme_E',      // mouth wide (E, I sounds)
  I: 'viseme_I',      // mouth wide
  O: 'viseme_O',      // mouth round (O, U sounds)
  U: 'viseme_U',      // mouth round
  M: 'viseme_M',      // mouth closed with lips pressed
  F: 'viseme_F',      // upper teeth on lower lip (F, V sounds)
  V: 'viseme_V',      // upper teeth on lower lip
  TH: 'viseme_TH',    // tongue between teeth (TH sounds)
  L: 'viseme_L',      // tongue up (L, R sounds)
  R: 'viseme_R',      // tongue up
  S: 'viseme_S',      // teeth almost closed (S, Z sounds)
  Z: 'viseme_Z',      // teeth almost closed
  SILENT: 'viseme_neutral', // neutral/resting position
};

export const PHONEME_DURATION_MAP: Record<Phoneme, number> = {
  A: 0.12,
  E: 0.10,
  I: 0.09,
  O: 0.11,
  U: 0.10,
  M: 0.15,
  F: 0.14,
  V: 0.13,
  TH: 0.14,
  L: 0.12,
  R: 0.11,
  S: 0.12,
  Z: 0.12,
  SILENT: 0.05,
};

export class PhonemeEngine {
  private phonemeBuffer: PhonemeData[] = [];
  private morphTargetMap: Map<string, number> = new Map();

  setMorphTargets(mesh: THREE.Mesh<any>) {
    if (!mesh.morphTargetInfluences) return;

    let index = 0;
    for (const visemeName of Object.values(PHONEME_TO_VISEME_MAP)) {
      this.morphTargetMap.set(visemeName, index);
      index++;
    }
  }

  // Convert audio frequency data to dominant phoneme
  analyzeAudioFrequencies(frequencyData: Uint8Array): Phoneme {
    if (!frequencyData || frequencyData.length === 0) return 'SILENT';

    const low = frequencyData.slice(0, Math.floor(frequencyData.length * 0.25));
    const mid = frequencyData.slice(Math.floor(frequencyData.length * 0.25), Math.floor(frequencyData.length * 0.75));
    const high = frequencyData.slice(Math.floor(frequencyData.length * 0.75));

    const avgLow = low.reduce((a, b) => a + b, 0) / low.length;
    const avgMid = mid.reduce((a, b) => a + b, 0) / mid.length;
    const avgHigh = high.reduce((a, b) => a + b, 0) / high.length;

    // Simple heuristic: classify based on frequency distribution
    if (avgHigh > avgMid * 1.5) return 'S'; // High frequencies → S/Z sounds
    if (avgLow > avgMid * 1.3) return 'A'; // Low frequencies → vowels
    if (avgMid > avgHigh && avgMid > avgLow) {
      const ratio = avgHigh / avgLow;
      if (ratio > 1.2) return 'E';
      if (ratio < 0.8) return 'O';
      return 'I';
    }

    return 'SILENT';
  }

  // Apply morphTarget blend based on emotion
  applyMorphTargets(
    mesh: THREE.Mesh<any>,
    currentPhoneme: Phoneme,
    emotion: RobotEmotion,
    audioIntensity: number,
  ): void {
    if (!mesh.morphTargetInfluences) return;

    const visemeTarget = PHONEME_TO_VISEME_MAP[currentPhoneme];
    const targetIndex = this.morphTargetMap.get(visemeTarget);

    if (targetIndex === undefined) return;

    // Reset all morphTargets
    for (let i = 0; i < mesh.morphTargetInfluences.length; i++) {
      mesh.morphTargetInfluences[i] = 0;
    }

    // Apply current phoneme intensity based on audio
    mesh.morphTargetInfluences[targetIndex] = Math.min(audioIntensity * 1.2, 1.0);

    // Apply emotion-based blends (e.g., smile for happy)
    this.applyEmotionalBlends(mesh, emotion);
  }

  private applyEmotionalBlends(mesh: THREE.Mesh<any>, emotion: RobotEmotion): void {
    if (!mesh.morphTargetInfluences) return;

    const emotionBlends: Record<RobotEmotion, Record<string, number>> = {
      happy: { viseme_E: 0.4, 'blink': 0.2 },
      excited: { viseme_E: 0.6, 'cheek_raise': 0.5 },
      concerned: { 'brow_down': 0.3, 'mouth_frown': 0.2 },
      warning: { 'brow_raise': 0.4 },
      danger: { 'eye_squint': 0.5, 'mouth_open': 0.3 },
      thinking: { 'brow_raise': 0.3 },
      sleepy: { 'eye_blink': 0.8 },
      success: { viseme_E: 0.5, 'cheek_raise': 0.4 },
      neutral: {},
    };

    const blends = emotionBlends[emotion] || {};
    for (const [blendName, intensity] of Object.entries(blends)) {
      const targetIndex = this.morphTargetMap.get(blendName);
      if (targetIndex !== undefined && mesh.morphTargetInfluences[targetIndex] !== undefined) {
        mesh.morphTargetInfluences[targetIndex] = Math.max(
          mesh.morphTargetInfluences[targetIndex],
          intensity,
        );
      }
    }
  }

  // Queue phoneme data from backend TTS
  queuePhonemes(phonemes: PhonemeData[]): void {
    this.phonemeBuffer = phonemes;
  }

  // Get current phoneme based on playback time
  getCurrentPhoneme(currentTime: number): PhonemeData | null {
    const current = this.phonemeBuffer.find((p) => p.time <= currentTime && currentTime < p.time + p.duration);
    return current || null;
  }

  // Get smoothly interpolated blendshape value
  getBlendshapeValue(phoneme: PhonemeData, currentTime: number): number {
    const elapsed = currentTime - phoneme.time;
    const progress = elapsed / phoneme.duration;
    const intensity = phoneme.confidence; // Use confidence as intensity

    if (progress < 0.3) {
      return (progress / 0.3) * intensity;
    } else if (progress > 0.7) {
      return ((1 - progress) / 0.3) * intensity;
    }
    return intensity;
  }

  clear(): void {
    this.phonemeBuffer = [];
  }
}

export const phonemeEngine = new PhonemeEngine();
