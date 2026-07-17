import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface RobotAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { w: 32, h: 32, body: 20, head: 16, eye: 3 },
  md: { w: 48, h: 48, body: 30, head: 24, eye: 4.5 },
  lg: { w: 64, h: 64, body: 40, head: 32, eye: 6 },
  xl: { w: 120, h: 120, body: 75, head: 60, eye: 11 },
};

export function RobotAvatar({ size = 'md', animate = true, className = '' }: RobotAvatarProps) {
  const [blink, setBlink] = useState(false);
  const s = sizeMap[size];
  const cx = s.w / 2;
  const cy = s.h / 2;

  useEffect(() => {
    if (!animate) return;
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [animate]);

  return (
    <motion.svg
      width={s.w}
      height={s.h}
      viewBox={`0 0 ${s.w} ${s.h}`}
      className={`${className}`}
      initial={animate ? { scale: 0.8, opacity: 0 } : undefined}
      animate={animate ? { scale: 1, opacity: 1 } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      {/* Glow effect */}
      <defs>
        <radialGradient id={`robot-glow-${size}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`robot-body-${size}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id={`robot-head-${size}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
      </defs>

      {/* Background glow */}
      <circle cx={cx} cy={cy} r={s.w * 0.45} fill={`url(#robot-glow-${size})`} />

      {/* Body / dome */}
      <ellipse
        cx={cx}
        cy={cy + s.body * 0.05}
        rx={s.body * 0.5}
        ry={s.body * 0.45}
        fill={`url(#robot-body-${size})`}
        stroke="#94a3b8"
        strokeWidth={1}
      />

      {/* Head */}
      <circle
        cx={cx}
        cy={cy - s.head * 0.15}
        r={s.head * 0.5}
        fill={`url(#robot-head-${size})`}
        stroke="#cbd5e1"
        strokeWidth={1.5}
      />

      {/* Antenna */}
      <line
        x1={cx}
        y1={cy - s.head * 0.65}
        x2={cx}
        y2={cy - s.head * 0.85}
        stroke="#94a3b8"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <circle
        cx={cx}
        cy={cy - s.head * 0.9}
        r={2.5}
        fill="#0ea5e9"
      >
        {animate && (
          <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
        )}
      </circle>

      {/* Eyes */}
      <ellipse
        cx={cx - s.head * 0.18}
        cy={cy - s.head * 0.15}
        rx={s.eye}
        ry={blink ? s.eye * 0.1 : s.eye}
        fill="#0c4a6e"
      />
      <ellipse
        cx={cx + s.head * 0.18}
        cy={cy - s.head * 0.15}
        rx={s.eye}
        ry={blink ? s.eye * 0.1 : s.eye}
        fill="#0c4a6e"
      />

      {/* Eye shine */}
      {!blink && (
        <>
          <circle cx={cx - s.head * 0.18 + s.eye * 0.3} cy={cy - s.head * 0.15 - s.eye * 0.3} r={s.eye * 0.25} fill="#38bdf8" />
          <circle cx={cx + s.head * 0.18 + s.eye * 0.3} cy={cy - s.head * 0.15 - s.eye * 0.3} r={s.eye * 0.25} fill="#38bdf8" />
        </>
      )}

      {/* Mouth / display panel */}
      <rect
        x={cx - s.body * 0.25}
        y={cy + s.body * 0.1}
        width={s.body * 0.5}
        height={s.body * 0.15}
        rx={2}
        fill="#0c4a6e"
      />

      {/* Mouth LED dots */}
      {[0, 1, 2].map(i => (
        <circle
          key={i}
          cx={cx - s.body * 0.15 + i * s.body * 0.15}
          cy={cy + s.body * 0.175}
          r={1.5}
          fill="#0ea5e9"
        >
          {animate && (
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
          )}
        </circle>
      ))}

      {/* Shoulders */}
      <circle cx={cx - s.body * 0.45} cy={cy + s.body * 0.3} r={4} fill="#cbd5e1" />
      <circle cx={cx + s.body * 0.45} cy={cy + s.body * 0.3} r={4} fill="#cbd5e1" />
    </motion.svg>
  );
}

export function RobotPulseBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <div className="relative inline-flex">
      <RobotAvatar size={size} animate />
      <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
      </span>
    </div>
  );
}
