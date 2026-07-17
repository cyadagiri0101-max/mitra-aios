import { RobotEmotion } from '../../types/robot.types';

export interface AudioFeatures {
  pitch: number;
  energy: number;
  tempo: number;
  variance: number;
  spectralCentroid: number;
  zeroCrossingRate: number;
}

export interface EmotionAnalysisResult {
  emotion: RobotEmotion;
  confidence: number;
  intensity: number;
  features: AudioFeatures;
}

export class VoiceEmotionAnalyzer {
  private minPitch = 50;
  private maxPitch = 500;
  private readonly emotionThresholds = {
    happy: { pitchMin: 250, energyMin: 0.6, varianceMax: 0.15 },
    excited: { pitchMin: 300, energyMin: 0.8, varianceMax: 0.2 },
    calm: { pitchMax: 150, energyMax: 0.4, varianceMax: 0.05 },
    concerned: { pitchMax: 180, energyMin: 0.5, varianceMin: 0.08 },
    angry: { energyMin: 0.75, pitchMin: 150, varianceMin: 0.12 },
    sad: { pitchMax: 120, energyMax: 0.35, varianceMax: 0.06 },
  };

  analyzeAudioFeatures(frequencyData: Uint8Array, timeDomainData?: Uint8Array): AudioFeatures {
    const pitch = this.extractPitch(frequencyData);
    const energy = this.calculateEnergy(frequencyData);
    const spectralCentroid = this.calculateSpectralCentroid(frequencyData);
    const zeroCrossingRate = this.calculateZeroCrossingRate(timeDomainData);
    const tempo = this.estimateTempo(frequencyData);
    const variance = this.calculateVariance(frequencyData);

    return {
      pitch,
      energy,
      tempo,
      variance,
      spectralCentroid,
      zeroCrossingRate,
    };
  }

  detectEmotionFromFeatures(features: AudioFeatures): EmotionAnalysisResult {
    let bestMatch: RobotEmotion = 'neutral';
    let bestConfidence = 0;

    // Score each emotion based on features
    const scores = {
      happy: this.scoreEmotion(features, 'happy'),
      excited: this.scoreEmotion(features, 'excited'),
      concerned: this.scoreEmotion(features, 'concerned'),
      warning: this.scoreEmotion(features, 'concerned') * 1.2, // Similar to concerned
      danger: this.scoreEmotion(features, 'angry'),
      thinking: this.scoreThinker(features),
      success: this.scoreEmotion(features, 'happy') * 0.9,
      sleepy: this.scoreEmotion(features, 'calm'),
      neutral: 0.5, // baseline
    };

    for (const [emotion, score] of Object.entries(scores)) {
      if (score > bestConfidence) {
        bestConfidence = score;
        bestMatch = emotion as RobotEmotion;
      }
    }

    // Clamp confidence to 0-1
    const confidence = Math.min(bestConfidence, 1.0);
    const intensity = this.calculateIntensity(features);

    return {
      emotion: bestMatch,
      confidence: Math.max(0, confidence),
      intensity,
      features,
    };
  }

  private scoreEmotion(features: AudioFeatures, emotion: keyof typeof this.emotionThresholds): number {
    const threshold = this.emotionThresholds[emotion] as any;
    let score = 0;
    let criteria = 0;

    if ('pitchMin' in threshold) {
      criteria++;
      if (features.pitch >= threshold.pitchMin) score += 1;
    }
    if ('pitchMax' in threshold) {
      criteria++;
      if (features.pitch <= threshold.pitchMax) score += 1;
    }
    if ('energyMin' in threshold) {
      criteria++;
      if (features.energy >= threshold.energyMin) score += 1;
    }
    if ('energyMax' in threshold) {
      criteria++;
      if (features.energy <= threshold.energyMax) score += 1;
    }
    if ('varianceMin' in threshold) {
      criteria++;
      if (features.variance >= threshold.varianceMin) score += 1;
    }
    if ('varianceMax' in threshold) {
      criteria++;
      if (features.variance <= threshold.varianceMax) score += 1;
    }

    return criteria > 0 ? score / criteria : 0;
  }

  private scoreThinker(features: AudioFeatures): number {
    // Thinking: moderate pitch, slightly lower energy, some variance
    const pitchScore = features.pitch > 100 && features.pitch < 200 ? 1 : 0;
    const energyScore = features.energy > 0.3 && features.energy < 0.6 ? 1 : 0;
    const varianceScore = features.variance > 0.06 && features.variance < 0.14 ? 1 : 0;
    return (pitchScore + energyScore + varianceScore) / 3;
  }

  private extractPitch(frequencyData: Uint8Array): number {
    // Simple pitch detection: find the peak frequency
    let maxEnergy = 0;
    let peakBin = 0;

    for (let i = 0; i < frequencyData.length; i++) {
      if (frequencyData[i] > maxEnergy) {
        maxEnergy = frequencyData[i];
        peakBin = i;
      }
    }

    // Convert bin to Hz (rough estimate)
    const nyquistFreq = 22050; // Standard for 44.1kHz sample rate
    const frequency = (peakBin / frequencyData.length) * nyquistFreq;

    return Math.max(this.minPitch, Math.min(this.maxPitch, frequency));
  }

  private calculateEnergy(frequencyData: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      sum += frequencyData[i] * frequencyData[i];
    }
    const rms = Math.sqrt(sum / frequencyData.length);
    return Math.min(rms / 255, 1.0); // Normalize to 0-1
  }

  private calculateSpectralCentroid(frequencyData: Uint8Array): number {
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < frequencyData.length; i++) {
      numerator += i * frequencyData[i];
      denominator += frequencyData[i];
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateZeroCrossingRate(timeDomainData?: Uint8Array): number {
    if (!timeDomainData || timeDomainData.length < 2) return 0;

    let crossings = 0;
    for (let i = 1; i < timeDomainData.length; i++) {
      const prev = timeDomainData[i - 1] - 128;
      const curr = timeDomainData[i] - 128;
      if ((prev > 0 && curr < 0) || (prev < 0 && curr > 0)) {
        crossings++;
      }
    }

    return crossings / timeDomainData.length;
  }

  private estimateTempo(frequencyData: Uint8Array): number {
    // Rough tempo estimation from energy in low frequencies
    const lowFreq = frequencyData.slice(0, Math.floor(frequencyData.length * 0.1));
    const avgLowEnergy = lowFreq.reduce((a, b) => a + b, 0) / lowFreq.length;

    // Map energy to BPM-like value (60-180)
    return 60 + (avgLowEnergy / 255) * 120;
  }

  private calculateVariance(frequencyData: Uint8Array): number {
    const mean = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
    const squaredDiffs = Array.from(frequencyData).map((v) => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / frequencyData.length;
    return Math.sqrt(variance) / 255; // Normalize
  }

  private calculateIntensity(features: AudioFeatures): number {
    // Intensity based on energy and variance
    return Math.min((features.energy + features.variance) / 2, 1.0);
  }
}

export const voiceEmotionAnalyzer = new VoiceEmotionAnalyzer();
