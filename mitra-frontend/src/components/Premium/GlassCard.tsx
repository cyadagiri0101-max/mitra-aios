import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'blue' | 'purple' | 'none';
  interactive?: boolean;
  delay?: number;
  intensity?: 'light' | 'medium' | 'heavy';
}

export function GlassCard({
  children,
  className = '',
  glowColor = 'cyan',
  interactive = false,
  delay = 0,
  intensity = 'medium',
}: GlassCardProps) {
  const intensityStyles = {
    light: {
      background: 'linear-gradient(135deg, rgba(17, 34, 64, 0.45) 0%, rgba(15, 28, 50, 0.55) 100%)',
      borderAlpha: 0.08,
    },
    medium: {
      background: 'linear-gradient(135deg, rgba(17, 34, 64, 0.66) 0%, rgba(15, 28, 50, 0.76) 100%)',
      borderAlpha: 0.12,
    },
    heavy: {
      background: 'linear-gradient(135deg, rgba(17, 34, 64, 0.85) 0%, rgba(15, 28, 50, 0.92) 100%)',
      borderAlpha: 0.16,
    },
  };

  const glowMap = {
    cyan: { color: '100, 255, 218', border: `rgba(100, 255, 218, ${intensityStyles[intensity].borderAlpha})` },
    blue: { color: '0, 180, 216', border: `rgba(0, 180, 216, ${intensityStyles[intensity].borderAlpha})` },
    purple: { color: '138, 43, 226', border: `rgba(138, 43, 226, ${intensityStyles[intensity].borderAlpha})` },
    none: { color: '73, 86, 112', border: `rgba(73, 86, 112, ${intensityStyles[intensity].borderAlpha})` },
  };

  const glow = glowMap[glowColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`relative backdrop-blur-xl rounded-2xl p-6 overflow-hidden ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
      style={{
        background: intensityStyles[intensity].background,
        border: `1px solid ${glow.border}`,
        boxShadow: `0 6px 18px rgba(0, 0, 0, 0.18)`,
      }}
      whileHover={
        interactive
          ? {
              y: -2,
              scale: 1.005,
              boxShadow: `0 14px 34px rgba(0, 0, 0, 0.22), 0 0 20px rgba(${glow.color}, 0.08)`,
            }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
}
