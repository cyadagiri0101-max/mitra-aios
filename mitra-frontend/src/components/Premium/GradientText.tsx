import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  variant?: 'cyan' | 'blue' | 'purple' | 'warm';
  animate?: boolean;
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'p';
}

export function GradientText({
  children,
  className = '',
  variant = 'cyan',
  animate = true,
  as: Component = 'span',
}: GradientTextProps) {
  const gradients = {
    cyan: 'linear-gradient(135deg, #64FFDA 0%, #00B4D8 50%, #64FFDA 100%)',
    blue: 'linear-gradient(135deg, #00B4D8 0%, #0096C7 50%, #64FFDA 100%)',
    purple: 'linear-gradient(135deg, #A78BFA 0%, #00B4D8 50%, #64FFDA 100%)',
    warm: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #EF4444 100%)',
  };

  const content = (
    <Component
      className={`inline-block ${className}`}
      style={{
        background: gradients[variant],
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      {children}
    </Component>
  );

  if (!animate) return content;

  return (
    <motion.span
      className="inline-block"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {content}
    </motion.span>
  );
}
