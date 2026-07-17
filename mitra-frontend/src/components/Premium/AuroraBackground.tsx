import { motion } from 'framer-motion';

interface AuroraBackgroundProps {
  className?: string;
  intensity?: 'subtle' | 'medium' | 'strong';
  showGrid?: boolean;
  showParticles?: boolean;
}

export function AuroraBackground({
  className = '',
  intensity = 'medium',
  showGrid = true,
  showParticles = true,
}: AuroraBackgroundProps) {
  const intensityMap = {
    subtle: { opacity: 0.4, blur: '80px' },
    medium: { opacity: 0.6, blur: '100px' },
    strong: { opacity: 0.85, blur: '120px' },
  };

  const { opacity, blur } = intensityMap[intensity];

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Base deep background */}
      <div className="absolute inset-0 bg-[#050D18]" />

      {/* Animated aurora blobs */}
      <motion.div
        className="absolute -top-1/4 -left-1/4 w-[70vw] h-[70vw] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0, 180, 216, 0.45) 0%, rgba(0, 120, 180, 0.15) 40%, transparent 70%)',
          filter: `blur(${blur})`,
          opacity,
        }}
        animate={{
          x: [0, 80, 40, 0],
          y: [0, 60, -40, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute top-1/3 -right-1/4 w-[60vw] h-[60vw] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(100, 255, 218, 0.35) 0%, rgba(0, 180, 216, 0.12) 45%, transparent 70%)',
          filter: `blur(${blur})`,
          opacity,
        }}
        animate={{
          x: [0, -60, -30, 0],
          y: [0, -50, 30, 0],
          scale: [1, 0.95, 1.05, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute -bottom-1/4 left-1/3 w-[55vw] h-[55vw] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(138, 43, 226, 0.25) 0%, rgba(0, 100, 200, 0.1) 40%, transparent 70%)',
          filter: `blur(${blur})`,
          opacity: opacity * 0.8,
        }}
        animate={{
          x: [0, 40, -60, 0],
          y: [0, -40, -60, 0],
          scale: [1, 1.08, 0.92, 1],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Soft vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(5, 13, 24, 0.6) 70%, rgba(5, 13, 24, 0.95) 100%)',
        }}
      />

      {/* Manufacturing grid overlay */}
      {showGrid && (
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(100, 255, 218, 0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(100, 255, 218, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: '72px 72px',
          }}
        />
      )}

      {/* Floating particles */}
      {showParticles && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 16 }).map((_, i) => {
            const size = 1 + Math.random() * 2;
            const isCyan = Math.random() > 0.4;
            return (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: size,
                  height: size,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: isCyan ? 'rgba(100, 255, 218, 0.7)' : 'rgba(0, 180, 216, 0.6)',
                  boxShadow: isCyan
                    ? '0 0 6px rgba(100, 255, 218, 0.5)'
                    : '0 0 6px rgba(0, 180, 216, 0.4)',
                }}
                animate={{
                  y: [0, Math.random() > 0.5 ? 120 : -120, 0],
                  x: [0, (Math.random() - 0.5) * 60, 0],
                  opacity: [0, 0.8, 0],
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 12 + Math.random() * 18,
                  delay: Math.random() * 8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
