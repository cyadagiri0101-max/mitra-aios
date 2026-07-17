import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';

export function RobotEffects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={1.6}
        luminanceThreshold={0.18}
        luminanceSmoothing={0.82}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.25} darkness={0.55} />
    </EffectComposer>
  );
}
