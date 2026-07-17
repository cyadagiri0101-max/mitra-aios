import { useEffect, useMemo, useRef, useState } from 'react';
import { Center, useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { computeAnimationFrame } from '../../core/robot-engine/AnimationEngine';
import { getLEDForEmotion } from '../../core/robot-engine/EmotionEngine';
import { RobotEmotion, RobotGesture, RobotPhysics, RobotState } from '../../types/robot.types';

const ROBOT_MODEL_URL = '/robot.glb';

interface RobotModelProps {
  state: RobotState;
  emotion: RobotEmotion;
  gesture: RobotGesture;
  mouthOpen: number;
  physics: RobotPhysics;
  compact?: boolean;
}

const clipAliases: Record<RobotGesture | RobotState, string[]> = {
  idle: ['idle', 'breath', 'float'],
  greeting: ['greet', 'hello', 'wave'],
  listening: ['listen', 'scan', 'idle'],
  thinking: ['think', 'idle'],
  searching: ['scan', 'search'],
  explaining: ['explain', 'talk', 'present'],
  speaking: ['talk', 'speak', 'wave'],
  presenting: ['present', 'point'],
  success: ['success', 'celebrate', 'thumb'],
  alert: ['alert', 'react', 'warning'],
  warning: ['warning', 'alert', 'react'],
  sleep: ['sleep', 'idle'],
  wave: ['wave', 'hello', 'greet'],
  point: ['point', 'present'],
  nod: ['nod'],
  shake: ['shake'],
  think: ['think', 'idle'],
  present: ['present', 'explain', 'point'],
  scan: ['scan', 'search', 'listen'],
  celebrate: ['celebrate', 'success', 'thumb'],
};

function pickClip(names: string[], gesture: RobotGesture, state: RobotState) {
  const candidates = [...(clipAliases[gesture] ?? []), ...(clipAliases[state] ?? [])];
  return names.find(name => {
    const normalized = name.toLowerCase();
    return candidates.some(candidate => normalized.includes(candidate));
  });
}

export function RobotModel({
  state,
  emotion,
  gesture,
  mouthOpen,
  physics,
  compact = false,
}: RobotModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const visualRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const [blink, setBlink] = useState(false);
  const gltf = useGLTF(ROBOT_MODEL_URL);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const { actions, names } = useAnimations(gltf.animations, visualRef);
  const led = getLEDForEmotion(emotion);

  useEffect(() => {
    scene.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach(material => {
        const standard = material as THREE.MeshStandardMaterial;
        if ('metalness' in standard) standard.metalness = Math.max(standard.metalness ?? 0, 0.55);
        if ('roughness' in standard) standard.roughness = Math.min(standard.roughness ?? 0.35, 0.32);
      });
    });
  }, [scene]);

  useEffect(() => {
    const clipName = pickClip(names, gesture, state);
    Object.values(actions).forEach(action => action?.fadeOut(0.15));

    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3500 + Math.random() * 2500);

    let activeAction: THREE.AnimationAction | undefined;
    if (clipName) {
      activeAction = actions[clipName] ?? undefined;
      activeAction?.reset().fadeIn(0.22).play();
    }

    return () => {
      clearInterval(blinkInterval);
      activeAction?.fadeOut(0.2);
    };
  }, [actions, gesture, names, state]);

  useFrame(({ clock, pointer }) => {
    const elapsedMs = clock.getElapsedTime() * 1000;
    const frame = computeAnimationFrame(state, gesture, physics, elapsedMs);

    if (groupRef.current) {
      groupRef.current.position.y = frame.floatOffset;
      groupRef.current.rotation.y = Math.sin(frame.time * 0.35) * 0.08 + pointer.x * 0.06;
      groupRef.current.rotation.z = frame.headTilt * 0.32;
    }

    if (visualRef.current) {
      visualRef.current.rotation.x = Math.sin(frame.time * 0.8) * 0.025;
      visualRef.current.rotation.z = gesture === 'point' ? -0.08 : 0;
    }

    if (mouthRef.current) {
      mouthRef.current.scale.set(1 + mouthOpen * 0.35, 1 + mouthOpen * 2.6, 1);
    }

    if (coreRef.current) {
      coreRef.current.scale.setScalar(frame.corePulse + mouthOpen * 0.12);
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = frame.ringRotation;
    }

    // Natural blinking
    const eyeScaleY = blink ? 0.08 : 1;
    if (leftEyeRef.current) {
      leftEyeRef.current.scale.set(1, eyeScaleY, 1);
    }
    if (rightEyeRef.current) {
      rightEyeRef.current.scale.set(1, eyeScaleY, 1);
    }
  });

  return (
    <group ref={groupRef}>
      <Center position={[0, -0.15, 0]}>
        <group ref={visualRef} scale={compact ? 1.18 : 1.42}>
          <primitive object={scene} />
        </group>
      </Center>

      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.86, 0]}>
        <torusGeometry args={[0.58, 0.006, 12, 128]} />
        <meshStandardMaterial
          color={led.core}
          emissive={led.core}
          emissiveIntensity={1.6 * led.intensity}
          transparent
          opacity={0.88}
          toneMapped={false}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.84, 0]}>
        <torusGeometry args={[0.38, 0.004, 12, 96]} />
        <meshStandardMaterial
          color={led.eyes}
          emissive={led.eyes}
          emissiveIntensity={1.2 * led.intensity}
          transparent
          opacity={0.7}
          toneMapped={false}
        />
      </mesh>

      <group position={[0, 0.35, 0.63]}>
        <mesh ref={leftEyeRef} position={[-0.16, 0.22, 0]}>
          <sphereGeometry args={[0.045, 24, 16]} />
          <meshStandardMaterial
            color={led.eyes}
            emissive={led.eyes}
            emissiveIntensity={3 * led.intensity}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={rightEyeRef} position={[0.16, 0.22, 0]}>
          <sphereGeometry args={[0.045, 24, 16]} />
          <meshStandardMaterial
            color={led.eyes}
            emissive={led.eyes}
            emissiveIntensity={3 * led.intensity}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={mouthRef} position={[0, 0.08, 0]}>
          <boxGeometry args={[0.24, 0.018, 0.012]} />
          <meshStandardMaterial
            color={led.core}
            emissive={led.core}
            emissiveIntensity={2.4 * led.intensity}
            toneMapped={false}
          />
        </mesh>
      </group>

      <mesh ref={coreRef} position={[0, -0.14, 0.58]}>
        <sphereGeometry args={[0.06, 32, 16]} />
        <meshStandardMaterial
          color={led.chest}
          emissive={led.chest}
          emissiveIntensity={2.8 * led.intensity}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

useGLTF.preload(ROBOT_MODEL_URL);
