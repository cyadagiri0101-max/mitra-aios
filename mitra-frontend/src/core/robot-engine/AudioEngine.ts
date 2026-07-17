export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;

  getContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) this.ctx = new Ctx();
    }
    return this.ctx;
  }

  attachToTTS(audio: HTMLAudioElement): AnalyserNode | null {
    const ctx = this.getContext();
    if (!ctx) return null;

    try {
      this.source = ctx.createMediaElementSource(audio);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.source.connect(this.analyser);
      this.analyser.connect(ctx.destination);
      this.dataArray = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
      return this.analyser;
    } catch {
      return null;
    }
  }

  attachToOscillator(): AnalyserNode | null {
    const ctx = this.getContext();
    if (!ctx) return null;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.dataArray = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
    return this.analyser;
  }

  getAmplitude(): number {
    if (!this.analyser || !this.dataArray) return 0;
    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) sum += this.dataArray[i];
    return sum / this.dataArray.length / 255;
  }

  getByteFrequencyData(): Uint8Array<ArrayBuffer> | null {
    if (!this.analyser || !this.dataArray) return null;
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  resume(): void {
    this.ctx?.resume();
  }

  destroy(): void {
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
    this.source = null;
  }
}

export const audioEngine = new AudioEngine();
