import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PremiumButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit';
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function PremiumButton({
  children,
  onClick,
  disabled = false,
  isLoading = false,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  icon,
  fullWidth = false,
}: PremiumButtonProps) {
  const sizeClasses = {
    sm: 'px-5 py-2.5 text-sm',
    md: 'px-7 py-3.5 text-base',
    lg: 'px-9 py-4 text-lg',
  };

  const variantStyles = {
    primary: {
      bg: 'linear-gradient(135deg, rgba(100, 255, 218, 0.95) 0%, rgba(0, 180, 216, 0.85) 100%)',
      text: '#050D18',
      shadow: '0 0 24px rgba(100, 255, 218, 0.25)',
      hoverShadow: '0 0 40px rgba(100, 255, 218, 0.45)',
      border: '1px solid rgba(100, 255, 218, 0.5)',
    },
    secondary: {
      bg: 'linear-gradient(135deg, rgba(0, 180, 216, 0.18) 0%, rgba(0, 120, 180, 0.1) 100%)',
      text: '#64FFDA',
      shadow: '0 0 16px rgba(0, 180, 216, 0.12)',
      hoverShadow: '0 0 28px rgba(0, 180, 216, 0.28)',
      border: '1px solid rgba(0, 180, 216, 0.35)',
    },
    ghost: {
      bg: 'transparent',
      text: '#E6F1FF',
      shadow: 'none',
      hoverShadow: '0 0 20px rgba(100, 255, 218, 0.12)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
    },
  };

  const style = variantStyles[variant];

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`relative rounded-2xl font-semibold overflow-hidden transition-colors duration-200 flex items-center justify-center gap-2.5 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110'
      } ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{
        background: style.bg,
        boxShadow: style.shadow,
        border: style.border,
        color: style.text,
      }}
      whileHover={{ boxShadow: style.hoverShadow, y: -1 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Shine effect */}
      {!disabled && !isLoading && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)',
          }}
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />
      )}

      {isLoading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {!isLoading && icon}
      {children}
    </motion.button>
  );
}
