import * as THREE from 'three';

export interface AudioSourceConfig {
  url: string;
  volume: number;
  distance: number;
  rolloffFactor: number;
  maxDistance: number;
  position: THREE.Vector3;
  autoplay: boolean;
  loop: boolean;
}

export class SpatialAudioEngine {
  private audioContext: AudioContext | null = null;
  private listener: THREE.AudioListener | null = null;
  private audioSources: Map<string, THREE.PositionalAudio> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  // Initialize spatial audio with Three.js listener
  initializeListener(camera: THREE.Camera): THREE.AudioListener {
    if (this.listener) return this.listener;

    this.listener = new THREE.AudioListener();
    camera.add(this.listener);

    return this.listener;
  }

  private loadAudio(audioElement: THREE.PositionalAudio, url: string): void {
    const loader = new THREE.AudioLoader();

    loader.load(url, (buffer) => {
      audioElement.setBuffer(buffer);

      if (audioElement.autoplay) {
        audioElement.play();
      }
    });
  }

  // Create a positional audio source
  createAudioSource(id: string, config: Partial<AudioSourceConfig>): THREE.PositionalAudio | null {
    if (!this.listener) return null;

    const audio = new THREE.PositionalAudio(this.listener);

    // Configure audio properties
    audio.setVolume(config.volume ?? 0.8);
    audio.setRefDistance(config.distance ?? 10);
    audio.setRolloffFactor(config.rolloffFactor ?? 1);
    audio.setMaxDistance(config.maxDistance ?? 500);

    if (config.position) {
      audio.position.copy(config.position);
    }

    if (config.autoplay) {
      audio.autoplay = true;
    }

    if (config.loop) {
      audio.loop = true;
    }

    // Load audio file
    if (config.url) {
      this.loadAudio(audio, config.url);
    }

    this.audioSources.set(id, audio);
    return audio;
  }

  // Update audio source position
  setAudioPosition(id: string, position: THREE.Vector3): void {
    const audio = this.audioSources.get(id);
    if (audio) {
      audio.position.copy(position);
    }
  }

  // Play audio source
  playAudio(id: string): void {
    const audio = this.audioSources.get(id);
    if (audio && !audio.isPlaying) {
      audio.play();
    }
  }

  // Stop audio source
  stopAudio(id: string): void {
    const audio = this.audioSources.get(id);
    if (audio && audio.isPlaying) {
      audio.stop();
    }
  }

  // Pause audio source
  pauseAudio(id: string): void {
    const audio = this.audioSources.get(id);
    if (audio && audio.isPlaying) {
      audio.pause();
    }
  }

  // Set volume
  setVolume(id: string, volume: number): void {
    const audio = this.audioSources.get(id);
    if (audio) {
      audio.setVolume(Math.max(0, Math.min(1, volume)));
    }
  }

  // Create 3D sound effect (short pops, chirps, etc.)
  playSound3D(position: THREE.Vector3, frequency: number = 440, duration: number = 0.1): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const panner = this.audioContext.createPanner();

    // Set panner position for 3D effect
    panner.setPosition(position.x, position.y, position.z);
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 500;
    panner.rolloffFactor = 1;

    // Configure oscillator
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    // Envelope
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.audioContext.destination);

    // Play
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Create directional audio (simulating speech direction)
  playDirectionalSpeech(
    audioBuffer: AudioBuffer,
    position: THREE.Vector3,
    direction: THREE.Vector3,
  ): void {
    if (!this.audioContext || !this.listener) return;

    const source = this.audioContext.createBufferSource();
    const panner = this.audioContext.createPanner();
    const gainNode = this.audioContext.createGain();

    // Set panner position
    panner.setPosition(position.x, position.y, position.z);

    // Set panner orientation for directional audio
    panner.setOrientation(direction.x, direction.y, direction.z);
    panner.panningModel = 'HRTF'; // Better spatial quality

    source.buffer = audioBuffer;
    gainNode.gain.value = 0.8;

    source.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.audioContext.destination);

    source.start(this.audioContext.currentTime);
  }

  // Get listener for adding to scene
  getListener(): THREE.AudioListener | null {
    return this.listener;
  }

  // Remove audio source
  removeAudioSource(id: string): void {
    const audio = this.audioSources.get(id);
    if (audio) {
      audio.stop();
      audio.disconnect();
      this.audioSources.delete(id);
    }
  }

  // Clean up all audio
  dispose(): void {
    for (const [, audio] of this.audioSources) {
      audio.stop();
      audio.disconnect();
    }
    this.audioSources.clear();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.listener = null;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
}

export const spatialAudioEngine = new SpatialAudioEngine();
