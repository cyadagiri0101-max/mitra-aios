import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface GlowBadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'accent';
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export function GlowBadge({
  children,
  variant = 'info',
  size = 'sm',
  pulse = false,
  className = '',
}: GlowBadgeProps) {
  const variants = {
    success: {
      bg: 'rgba(46, 204, 113, 0.12)',
      border: 'rgba(46, 204, 113, 0.25)',
      color: '#2ECC71',
      glow: 'rgba(46, 204, 113, 0.3)',
    },
    warning: {
      bg: 'rgba(243, 156, 18, 0.12)',
      border: 'rgba(243, 156, 18, 0.25)',
      color: '#F39C12',
      glow: 'rgba(243, 156, 18, 0.3)',
    },
    danger: {
      bg: 'rgba(231, 76, 60, 0.12)',
      border: 'rgba(231, 76, 60, 0.25)',
      color: '#E74C3C',
      glow: 'rgba(231, 76, 60, 0.3)',
    },
    info: {
      bg: 'rgba(0, 180, 216, 0.12)',
      border: 'rgba(0, 180, 216, 0.25)',
      color: '#00B4D8',
      glow: 'rgba(0, 180, 216, 0.3)',
    },
    accent: {
      bg: 'rgba(100, 255, 218, 0.12)',
      border: 'rgba(100, 255, 218, 0.25)',
      color: '#64FFDA',
      glow: 'rgba(100, 255, 218, 0.3)',
    },
  };

  const style = variants[variant];
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <motion.span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
        color: style.color,
        boxShadow: `0 0 12px ${style.glow}`,
      }}
      whileHover={{ boxShadow: `0 0 18px ${style.glow}` }}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: style.color }}
          />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: style.color }} />
        </span>
      )}
      {children}
    </motion.span>
  );
}
