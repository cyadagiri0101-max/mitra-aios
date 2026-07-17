import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { GlassCard } from './Premium/GlassCard';
import { AnimatedNumber } from './Premium/AnimatedNumber';
import { GlowBadge } from './Premium/GlowBadge';
import { TrendChip } from './Premium/TrendChip';
import { Sparkline } from './Premium/Sparkline';
import { InsightLabel } from './Premium/InsightLabel';
import { TimestampLabel } from './Premium/TimestampLabel';

export interface KpiCardProps {
  title: string;
  value: number;
  displayValue?: string;
  suffix?: string;
  prefix?: string;
  trend?: number;
  trendLabel?: string;
  trendDirection?: 'up' | 'down' | 'stable';
  insight?: string;
  icon: LucideIcon;
  variant?: 'success' | 'warning' | 'danger' | 'info';
  status?: string;
  sparklineData?: number[];
  updatedAt?: string;
  delay?: number;
  loading?: boolean;
}

const variantColors = {
  success: '#2ECC71',
  warning: '#F39C12',
  danger: '#E74C3C',
  info: '#00B4D8',
};

export function KpiCard({
  title,
  value,
  displayValue,
  suffix = '',
  prefix = '',
  trend,
  trendLabel,
  trendDirection = 'stable',
  insight,
  icon: Icon,
  variant = 'info',
  status,
  sparklineData,
  updatedAt,
  delay = 0,
  loading = false,
}: KpiCardProps) {
  const color = variantColors[variant];
  const showTrend = !loading && trend !== undefined;

  return (
    <GlassCard
      intensity="medium"
      glowColor={variant === 'danger' ? 'none' : variant === 'warning' ? 'blue' : 'cyan'}
      interactive
      delay={delay}
      className="relative h-full min-h-[180px] p-6 flex flex-col justify-between overflow-hidden transition-transform duration-300 ease-out hover:-translate-y-1 hover:border-white/15 rounded-[28px]"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[rgba(0,199,255,0.10)] blur-2xl" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-20 w-20 -translate-x-1/2 rounded-full bg-[rgba(56,189,248,0.10)] blur-2xl" />
      {/* Header: icon + status */}
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-white/10"
          style={{
            backgroundColor: `${color}12`,
            border: `1px solid ${color}20`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {loading ? (
          <span className="h-6 w-20 rounded-full bg-white/10 animate-pulse" />
        ) : (
          status && (
            <GlowBadge variant={variant} size="sm" pulse={variant === 'danger' || variant === 'warning'}>
              {status}
            </GlowBadge>
          )
        )}
      </div>

      {/* Value */}
      <div className="mt-4">
        {loading ? (
          <span className="block h-3 w-28 rounded bg-white/10 animate-pulse mb-3" />
        ) : (
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-[#94A3B8] mb-2">
            {title}
          </p>
        )}
        <div className="flex items-end gap-3 flex-wrap">
          <AnimatedNumber
            value={value}
            displayValue={displayValue}
            prefix={prefix}
            suffix={suffix}
            delay={delay + 0.1}
            loading={loading}
            className="text-3xl md:text-4xl font-bold text-white tracking-tight"
          />
          {showTrend ? (
            <TrendChip trend={trend} direction={trendDirection} label={trendLabel} />
          ) : (
            <span className="h-6 w-16 rounded-full bg-white/10 animate-pulse" />
          )}
        </div>
      </div>

      {/* Insight */}
      {loading ? (
        <div className="mt-3">
          <span className="block h-3 w-32 rounded bg-white/10 animate-pulse" />
        </div>
      ) : (
        insight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.3 }}
            className="mt-3"
          >
            <InsightLabel>{insight}</InsightLabel>
          </motion.div>
        )
      )}

      {/* Footer: timestamp + sparkline */}
      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
          {loading ? (
            <span className="h-3 w-24 rounded bg-white/10 animate-pulse" />
          ) : (
            updatedAt ? <TimestampLabel label={`Updated ${updatedAt}`} /> : <span className="text-slate-500">No update timestamp</span>
          )}
          {loading ? (
            <span className="h-10 w-16 rounded-lg bg-white/10 animate-pulse ml-auto" />
          ) : sparklineData ? (
            <div className="ml-auto flex-shrink-0">
              <Sparkline data={sparklineData} color={color} />
            </div>
          ) : (
            <span className="ml-auto text-xs text-slate-500">Sparkline unavailable</span>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
