import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Float } from '@react-three/drei';
import { RobotEffects } from './RobotEffects';
import { RobotModel } from './RobotModel';
import { RobotParticles } from './RobotParticles';
import { getLEDForEmotion } from '../../core/robot-engine/EmotionEngine';
import { RobotEmotion, RobotGesture, RobotPhysics, RobotState } from '../../types/robot.types';

interface RobotCanvasProps {
  state: RobotState;
  emotion: RobotEmotion;
  gesture: RobotGesture;
  speaking: boolean;
  mouthOpen: number;
  physics: RobotPhysics;
  compact?: boolean;
}

function RobotFallback({ color }: { color: string }) {
  return (
    <Float speed={1.4} rotationIntensity={0.12} floatIntensity={0.42}>
      <mesh>
        <sphereGeometry args={[0.34, 48, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
    </Float>
  );
}

export function RobotCanvas({
  state,
  emotion,
  gesture,
  speaking,
  mouthOpen,
  physics,
  compact = false,
}: RobotCanvasProps) {
  const led = getLEDForEmotion(emotion);

  return (
    <Canvas
      camera={{ position: [0, 0.35, compact ? 3.7 : 3.25], fov: compact ? 32 : 35 }}
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true }}
      shadows
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 4]} intensity={2.2} color="#dff7ff" castShadow />
      <pointLight position={[-2.5, 1.5, 2.5]} intensity={1.7} color={led.core} />
      <pointLight position={[2.5, -0.2, 2.2]} intensity={speaking ? 2.4 : 1.4} color={led.eyes} />

      <Suspense fallback={<RobotFallback color={led.core} />}>
        <RobotParticles color={led.core} intensity={led.intensity} />
        <RobotModel
          state={state}
          emotion={emotion}
          gesture={gesture}
          mouthOpen={mouthOpen}
          physics={physics}
          compact={compact}
        />
        <ContactShadows position={[0, -0.9, 0]} opacity={0.35} blur={2.4} scale={3.2} color="#00b4d8" />
        <RobotEffects />
      </Suspense>
    </Canvas>
  );
}
