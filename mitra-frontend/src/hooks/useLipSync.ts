import { useEffect, useMemo, useState } from 'react';
import { audioEngine } from '../core/robot-engine/AudioEngine';
import { createLipSyncEngine } from '../core/robot-engine/LipSyncEngine';

export function useLipSync(active: boolean, seedText = '') {
  const lipSync = useMemo(() => createLipSyncEngine(audioEngine), []);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    let raf = 0;
    const syllables = Math.max(4, seedText.trim().split(/\s+/).length * 1.7);

    const tick = () => {
      const analyserLevel = lipSync.update();
      const elapsed = performance.now() / 1000;
      const speechEnvelope = active
        ? Math.max(
            0,
            Math.sin(elapsed * syllables) * 0.35 +
              Math.sin(elapsed * 17.5) * 0.2 +
              Math.sin(elapsed * 31) * 0.12,
          )
        : 0;

      setLevel(previous => {
        const target = Math.max(analyserLevel, speechEnvelope);
        const smoothing = active ? 0.36 : 0.2;
        return previous + (target - previous) * smoothing;
      });

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      lipSync.reset();
    };
  }, [active, lipSync, seedText]);

  return Math.min(1, Math.max(0, level));
}
