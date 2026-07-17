import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface RobotParticlesProps {
  color: string;
  intensity: number;
}

export function RobotParticles({ color, intensity }: RobotParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i += 1) {
      const radius = 0.55 + Math.random() * 1.1;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.random() * 2.2 - 0.95;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }

    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return nextGeometry;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const elapsed = clock.getElapsedTime();
    pointsRef.current.rotation.y = elapsed * 0.08;
    pointsRef.current.position.y = Math.sin(elapsed * 0.9) * 0.025;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color={color}
        size={0.018}
        transparent
        opacity={0.2 + intensity * 0.16}
        depthWrite={false}
      />
    </points>
  );
}
