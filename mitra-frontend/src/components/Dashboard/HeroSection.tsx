import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../Premium/GlassCard';
import { GradientText } from '../Premium/GradientText';
import { formatINR, DashboardSummary } from '../../utils/dashboardMapping';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface HeroSectionProps {
  summary: DashboardSummary | null;
}

export function HeroSection({ summary }: HeroSectionProps) {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || user?.firstName || 'Admin';
  const available = summary !== null;

  return (
    <GlassCard intensity="medium" glowColor="cyan" className="overflow-visible p-10 md:p-12 xl:p-14 min-h-[340px]">
      <div className="flex flex-col gap-10 xl:flex-row xl:items-start xl:justify-between">
        {/* Left: Greeting */}
        <div className="flex-1 min-w-0 max-w-4xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Operational intelligence</p>
            <h1 className="text-4xl md:text-5xl xl:text-6xl font-extrabold text-white tracking-tight leading-tight">
              {getGreeting()},{' '}
              <GradientText variant="cyan" animate={false}>
                {firstName}
              </GradientText>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-base md:text-lg text-slate-200 max-w-3xl leading-8 tracking-wide"
          >
            MITRA operational visibility for leaders — project pipeline, quality status, and commercial
            value from the authoritative MITRA data sources.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 grid gap-3 sm:grid-cols-3"
          >
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200">
              <p className="font-semibold text-white">{available ? summary.activeProjects : '—'}</p>
              <p className="mt-2 text-xs text-slate-400">Active projects</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200">
              <p className="font-semibold text-white">{available ? formatINR(summary.quotationValue) : '—'}</p>
              <p className="mt-2 text-xs text-slate-400">Quotation value (active quotes)</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200">
              <p className="font-semibold text-white">{available ? summary.openNcrs : '—'}</p>
              <p className="mt-2 text-xs text-slate-400">Open NCRs</p>
            </div>
          </motion.div>
        </div>

        {/* Right: Status & Metrics */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-start md:items-end gap-4"
        >
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_18px_45px_-22px_rgba(0,0,0,0.40)] backdrop-blur-md min-w-[260px] max-w-sm">
            <div className="mb-4 text-xs uppercase tracking-[0.18em] text-slate-400">Operational Snapshot</div>
            <motion.div
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderColor: 'rgba(255, 255, 255, 0.14)',
                color: '#CFFAFE',
              }}
              initial={{ y: 0 }}
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
            >
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-teal-400" />
              <span>{available ? 'Data Synced' : 'Connecting to data source'}</span>
            </motion.div>

            <div className="mt-6 grid gap-3">
              <div className="rounded-3xl bg-slate-950/75 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Projects in dispatch</p>
                <p className="mt-2 text-2xl font-semibold text-white">{available ? summary.inDispatch : '—'}</p>
                <p className="mt-1 text-sm text-slate-400">Awaiting shipment</p>
              </div>
              <div className="rounded-3xl bg-slate-950/75 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Open CAPAs</p>
                <p className="mt-2 text-2xl font-semibold text-white">{available ? summary.openCapas : '—'}</p>
                <p className="mt-1 text-sm text-slate-400">From quality records</p>
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Today</p>
              <p className="mt-2 text-sm md:text-base font-mono text-slate-200">
                {formatDate(new Date())}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </GlassCard>
  );
}