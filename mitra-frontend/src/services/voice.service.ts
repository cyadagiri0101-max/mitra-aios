import { audioEngine } from '../core/robot-engine/AudioEngine';

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string, onStart?: () => void, onEnd?: () => void): SpeechSynthesisUtterance {
  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.05;
  utterance.volume = 1;

  // Try to select a natural English voice
  const voices = speechSynthesis.getVoices();
  const preferred =
    voices.find(v => v.name.includes('Google US English')) ||
    voices.find(v => v.name.includes('Samantha')) ||
    voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) ||
    voices.find(v => v.lang.startsWith('en'));
  if (preferred) utterance.voice = preferred;

  utterance.onstart = () => {
    audioEngine.resume();
    onStart?.();
  };
  utterance.onend = () => {
    currentUtterance = null;
    onEnd?.();
  };
  utterance.onerror = () => {
    currentUtterance = null;
    onEnd?.();
  };

  currentUtterance = utterance;
  speechSynthesis.speak(utterance);
  return utterance;
}

export function stopSpeaking(): void {
  if (currentUtterance) {
    currentUtterance.onend = null;
    currentUtterance.onerror = null;
  }
  if (speechSynthesis.speaking || speechSynthesis.pending) {
    speechSynthesis.cancel();
  }
  currentUtterance = null;
}

export function isSpeaking(): boolean {
  return speechSynthesis.speaking;
}

// Pre-load voices for some browsers
if (typeof window !== 'undefined') {
  speechSynthesis.getVoices();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
  }
}
