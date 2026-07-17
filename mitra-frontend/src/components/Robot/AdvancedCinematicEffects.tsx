import { EffectComposer, Bloom, DepthOfField, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

export interface CinematicEffectsConfig {
  bloomIntensity: number;
  bloomThreshold: number;
  bloomSmoothing: number;
  depthOfFieldEnabled: boolean;
  depthOfFieldDistance: number;
  depthOfFieldFocal: number;
  noiseOpacity: number;
  vignetteEnabled: boolean;
  vignetteDarkness: number;
  chromaticAberrationEnabled: boolean;
  chromaticAberrationAmount: number;
}

export const defaultCinematicConfig: CinematicEffectsConfig = {
  bloomIntensity: 2.5,
  bloomThreshold: 0.15,
  bloomSmoothing: 0.8,
  depthOfFieldEnabled: true,
  depthOfFieldDistance: 5.0,
  depthOfFieldFocal: 0.02,
  noiseOpacity: 0.02,
  vignetteEnabled: true,
  vignetteDarkness: 1.4,
  chromaticAberrationEnabled: false,
  chromaticAberrationAmount: 0.03,
};

export const cinematicPresets = {
  // Maximum cinematic quality (AAA game level)
  cinematic: {
    bloomIntensity: 2.5,
    bloomThreshold: 0.15,
    bloomSmoothing: 0.8,
    depthOfFieldEnabled: true,
    depthOfFieldDistance: 5.0,
    depthOfFieldFocal: 0.02,
    noiseOpacity: 0.03,
    vignetteEnabled: true,
    vignetteDarkness: 1.4,
    chromaticAberrationEnabled: false,
    chromaticAberrationAmount: 0.02,
  },

  // Holographic neon theme (sci-fi)
  holographic: {
    bloomIntensity: 3.2,
    bloomThreshold: 0.08,
    bloomSmoothing: 0.9,
    depthOfFieldEnabled: false,
    depthOfFieldDistance: 5.0,
    depthOfFieldFocal: 0.02,
    noiseOpacity: 0.05,
    vignetteEnabled: true,
    vignetteDarkness: 1.6,
    chromaticAberrationEnabled: false,
    chromaticAberrationAmount: 0.035,
  },

  // Film noir with grain
  filmNoir: {
    bloomIntensity: 1.2,
    bloomThreshold: 0.3,
    bloomSmoothing: 0.6,
    depthOfFieldEnabled: true,
    depthOfFieldDistance: 3.0,
    depthOfFieldFocal: 0.01,
    noiseOpacity: 0.12,
    vignetteEnabled: true,
    vignetteDarkness: 2.0,
    chromaticAberrationEnabled: false,
    chromaticAberrationAmount: 0.0,
  },

  // Clean studio
  studio: {
    bloomIntensity: 1.5,
    bloomThreshold: 0.25,
    bloomSmoothing: 0.7,
    depthOfFieldEnabled: false,
    depthOfFieldDistance: 10.0,
    depthOfFieldFocal: 0.02,
    noiseOpacity: 0.01,
    vignetteEnabled: false,
    vignetteDarkness: 1.0,
    chromaticAberrationEnabled: false,
    chromaticAberrationAmount: 0.0,
  },

  // Minimal (light performance)
  minimal: {
    bloomIntensity: 1.0,
    bloomThreshold: 0.4,
    bloomSmoothing: 0.5,
    depthOfFieldEnabled: false,
    depthOfFieldDistance: 10.0,
    depthOfFieldFocal: 0.02,
    noiseOpacity: 0.0,
    vignetteEnabled: false,
    vignetteDarkness: 1.0,
    chromaticAberrationEnabled: false,
    chromaticAberrationAmount: 0.0,
  },
};

export interface CinematicEffectsProps {
  config?: Partial<CinematicEffectsConfig>;
  preset?: keyof typeof cinematicPresets;
  emotionIntensity?: number;
}

/**
 * Advanced cinematic effects component for robot assistant
 * Provides AAA game-level visual quality with customizable presets
 */
export function AdvancedCinematicEffects({
  config,
  preset = 'cinematic',
  emotionIntensity = 0.5,
}: CinematicEffectsProps) {
  // Merge preset with custom config
  const presetConfig = cinematicPresets[preset];
  const finalConfig = { ...defaultCinematicConfig, ...presetConfig, ...config };

  // Dynamic bloom intensity based on emotion
  const dynamicBloomIntensity = finalConfig.bloomIntensity + emotionIntensity * 0.5;

  const depthOfField = finalConfig.depthOfFieldEnabled ? (
    <DepthOfField focusDistance={finalConfig.depthOfFieldDistance} focalLength={finalConfig.depthOfFieldFocal} bokehScale={2} />
  ) : (
    <></>
  );

  const noise = finalConfig.noiseOpacity > 0 ? (
    <Noise opacity={finalConfig.noiseOpacity} blendFunction={BlendFunction.OVERLAY} />
  ) : (
    <></>
  );

  const vignette = finalConfig.vignetteEnabled ? (
    <Vignette offset={0.1} darkness={finalConfig.vignetteDarkness} blendFunction={BlendFunction.NORMAL} eskil={false} />
  ) : (
    <></>
  );

  return (
    <EffectComposer>
      <Bloom
        blendFunction={BlendFunction.SCREEN}
        intensity={dynamicBloomIntensity}
        luminanceThreshold={finalConfig.bloomThreshold}
        luminanceSmoothing={finalConfig.bloomSmoothing}
      />
      {depthOfField}
      {noise}
      {vignette}
    </EffectComposer>
  );
}

export default AdvancedCinematicEffects;
