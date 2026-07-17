import { AudioEngine } from './AudioEngine';

export class LipSyncEngine {
  private audio: AudioEngine;
  private mouthOpen = 0;
  private smoothing = 0.2;

  constructor(audio: AudioEngine) {
    this.audio = audio;
  }

  update(): number {
    const amp = this.audio.getAmplitude();
    // Smooth the mouth opening to avoid jitter
    this.mouthOpen += (amp - this.mouthOpen) * this.smoothing;
    return Math.min(1, Math.max(0, this.mouthOpen));
  }

  getMouthScale(): number {
    return 1 + this.mouthOpen * 1.2;
  }

  reset(): void {
    this.mouthOpen = 0;
  }
}

export function createLipSyncEngine(audio: AudioEngine): LipSyncEngine {
  return new LipSyncEngine(audio);
}
