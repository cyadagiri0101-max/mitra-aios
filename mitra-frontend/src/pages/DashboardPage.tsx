import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Clock, CheckCircle, FolderKanban, FileText } from 'lucide-react';
import { HeroSection } from '../components/Dashboard/HeroSection';
import { KpiCard } from '../components/KpiCard';
import { KPI_MOCK, AI_INSIGHTS, RECENT_ACTIVITIES } from './dashboardMockData';

const WORKFLOW_STAGES = [
  { code: 'ENQUIRY', label: 'Enquiry', count: 142, status: 'completed' as const },
  { code: 'QUOTATION', label: 'Quotation', count: 98, status: 'completed' as const },
  { code: 'DESIGN', label: 'Design', count: 76, status: 'completed' as const },
  { code: 'PLANNING', label: 'Planning', count: 44, status: 'current' as const },
  { code: 'MANUFACTURING', label: 'Manufacturing', count: 32, status: 'pending' as const },
  { code: 'QUALITY', label: 'Quality', count: 21, status: 'pending' as const },
  { code: 'DISPATCH', label: 'Dispatch', count: 14, status: 'pending' as const },
  { code: 'SERVICE', label: 'Service', count: 8, status: 'pending' as const },
];

const FACTORY_MACHINES = [
  { name: 'CNC Machine 3', status: 'Idle', state: 'Awaiting parts', variant: 'warning' as const },
  { name: 'Laser Cutter', status: 'Running', state: 'Processing batch 24', variant: 'success' as const },
  { name: 'Press Line', status: 'Quality Hold', state: 'Pending inspection', variant: 'danger' as const },
  { name: 'Assembly Cell', status: 'Ready', state: 'Awaiting dispatch', variant: 'success' as const },
];

const AI_RECOMMENDATIONS = [
  { title: 'Rebalance CNC scheduling', description: 'Move low-priority jobs to spare capacity to reduce idle time.', badge: 'Optimize' },
  { title: 'Approve expedited material order', description: 'Aluminum supplies are tight; early approval reduces shipment risk.', badge: 'Critical' },
  { title: 'Trigger quality sweep', description: 'Inspect batch A-220 now to avoid escalation into overdue CAPA.', badge: 'Quality' },
];

// AI insights and recent activities are centralized in dashboardMockData.ts

function WorkflowTimeline({ stages, selectedStage, onSelect }: { stages: typeof WORKFLOW_STAGES; selectedStage: string; onSelect: (stageCode: string) => void }) {
  const completedCount = stages.filter(s => s.status === 'completed').length;
  const totalActive = stages.length;
  const progressPercent = totalActive > 0 ? (completedCount / totalActive) * 100 : 0;
  const selectedDetails = stages.find((stage) => stage.code === selectedStage) ?? stages[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel rounded-3xl border border-white/10 bg-slate-950/75 p-6 shadow-2xl shadow-cyan-500/10"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-100">Project Lifecycle</h3>
            <p className="mt-2 text-sm text-slate-400">A horizontal stage flow showing completion status from enquiry to service.</p>
          </div>
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-cyan-200">
            <span className="text-slate-300">Progress</span>
            <span className="font-mono text-white">{Math.round(progressPercent)}%</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 px-3 py-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Completed
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 px-3 py-1">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" /> Current
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 px-3 py-1">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-600" /> Pending
          </span>
        </div>

        <div className="space-y-4">
          <div className="rounded-full bg-slate-900/80 h-2 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-cyan-400"
              initial={{ width: '0%' }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>

          <div className="relative overflow-x-auto py-4">
            <div className="pointer-events-none absolute left-6 right-6 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-800" />
            <div className="relative flex items-center justify-between gap-4 px-4" role="list" aria-label="workflow stages">
              {stages.map((stage, index) => {
                const isCompleted = stage.status === 'completed';
                const isCurrent = stage.status === 'current';
                const isSelected = selectedStage === stage.code;

                return (
                  <motion.button
                    key={stage.code}
                    type="button"
                    onClick={() => onSelect(stage.code)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.06 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative flex min-w-[120px] max-w-[140px] flex-col items-center rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-4 text-center shadow-sm transition duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 ${isSelected ? 'ring-2 ring-cyan-400/40 bg-slate-900/80' : 'hover:bg-slate-900/70'}`}
                    aria-pressed={isSelected}
                    aria-current={isCurrent ? 'step' : undefined}
                    aria-label={`Select ${stage.label} stage`}
                  >
                    <div
                      className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2"
                      style={{
                        backgroundColor: isCompleted ? 'var(--color-success)' : isCurrent ? 'rgba(56, 189, 248, 0.16)' : 'rgba(148, 163, 184, 0.16)',
                        borderColor: isCompleted ? 'var(--color-success)' : isCurrent ? 'var(--color-accent)' : 'rgba(148, 163, 184, 0.22)',
                      }}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-white" strokeWidth={2} />
                      ) : (
                        <span
                          className="inline-flex h-3.5 w-3.5 rounded-full"
                          style={{ backgroundColor: isCurrent ? 'var(--color-accent)' : 'rgba(148, 163, 184, 0.8)' }}
                        />
                      )}
                    </div>

                    <p
                      className="mt-3 text-[0.76rem] leading-5 font-semibold tracking-[0.02em] text-slate-100"
                    >
                      {stage.label}
                    </p>
                    <span
                      className="mt-2 rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em]"
                      style={{
                        backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.16)' : isCurrent ? 'rgba(56, 189, 248, 0.16)' : 'rgba(148, 163, 184, 0.14)',
                        color: isCompleted ? 'var(--color-success)' : isCurrent ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                        border: isCurrent ? '1px solid rgba(56, 189, 248, 0.28)' : undefined,
                      }}
                    >
                      {isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Pending'}
                    </span>
                    {typeof stage.count === 'number' && (
                      <span className="mt-3 text-[0.72rem] font-mono text-slate-400">{stage.count} items</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Selected stage</p>
                <h4 className="mt-2 text-lg font-semibold text-white">{selectedDetails.label}</h4>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                <span>{selectedDetails.status.toUpperCase()}</span>
                <span className="font-mono">{selectedDetails.count} items</span>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              {selectedDetails.status === 'current'
                ? 'This stage is active now: keep handoffs clear and reduce cycle time to minimize downstream delays.'
                : selectedDetails.status === 'completed'
                ? 'Completed stages are stabilized. Maintain quality gates and confirm handoff readiness.'
                : 'Pending stages are preparing to start—align resources and validate requirements before launch.'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function DashboardPage() {
  const [selectedStage, setSelectedStage] = useState(
    WORKFLOW_STAGES.find((stage) => stage.status === 'current')?.code ?? WORKFLOW_STAGES[0].code,
  );

  const { isLoading: isKpiLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/project/dashboard/stats').then((r) => r.data),
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  });

  const { data: eklWidgets, isLoading: isEklLoading } = useQuery({
    queryKey: ['knowledge-repo-stats'],
    queryFn: () => api.get('/knowledge/search', { params: { limit: 1 } }).then((r) => r.data),
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: engWidgets, isLoading: isEngLoading } = useQuery({
    queryKey: ['knowledge-repo-stats-eng'],
    queryFn: () => api.get('/knowledge/search', { params: { limit: 1, domain: 'ENGINEERING' } }).then((r) => r.data),
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  // Auto-refresh simulation: update activity feed every 30 seconds
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTick(t => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      <div className="max-w-screen-xl mx-auto px-4">
        <section aria-labelledby="dashboard-overview-heading">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Dashboard overview</p>
              <h2 id="dashboard-overview-heading" className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
                Live production performance at a glance
              </h2>
            </div>
            <div className="rounded-full bg-white/5 px-4 py-2 text-sm text-slate-300 ring-1 ring-white/10">
              Updated every 30 seconds
            </div>
          </div>
        </section>

        <section className="mt-6" aria-labelledby="dashboard-key-metrics-heading">
          <HeroSection />

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6" aria-labelledby="dashboard-key-metrics-heading">
            <h3 id="dashboard-key-metrics-heading" className="sr-only">
              Key performance indicators
            </h3>
            <KpiCard {...KPI_MOCK.machinesRunning} loading={isKpiLoading} />
            <KpiCard {...KPI_MOCK.openProjects} loading={isKpiLoading} />
            <KpiCard {...KPI_MOCK.pendingDispatches} loading={isKpiLoading} />
            <KpiCard {...KPI_MOCK.overdueCAPAs} loading={isKpiLoading} />
          </div>
        </section>

        <section className="mt-8" aria-labelledby="ekl-dashboard-heading">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Engineering Knowledge</p>
              <h3 id="ekl-dashboard-heading" className="mt-2 text-xl font-semibold text-white">Knowledge Repository Index</h3>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-5">
              <div className="flex items-center gap-3">
                <FolderKanban className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-sm text-slate-400">Indexed Knowledge Records</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{eklWidgets?.total ?? '—'}</p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-5">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-sm text-slate-400">Engineering Documents &amp; Articles</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{engWidgets?.total ?? (isEngLoading ? 'Loading…' : '—')}</p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-5">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-sm text-slate-400">Search Engine</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{isEklLoading ? 'Loading…' : 'Native'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="workflow-timeline-heading">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center rounded-full bg-slate-900/70 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-200">
              Workflow focus
            </div>
            <h3 id="workflow-timeline-heading" className="text-xl font-semibold text-white">
              Project lifecycle flow
            </h3>
          </div>
          <div className="mt-4">
            <WorkflowTimeline stages={WORKFLOW_STAGES} selectedStage={selectedStage} onSelect={setSelectedStage} />
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
          <div className="xl:col-span-2 space-y-6">
          <div className="glass-panel rounded-lg p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-100">Factory Overview</h3>
                <p className="mt-1 text-sm text-slate-400">Live machine states and overlay indicators for shop floor operations.</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">Live Overlay</span>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1.7fr_1fr]">
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">Factory floor map</p>
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Updated now</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {FACTORY_MACHINES.map((machine) => (
                    <button
                      key={machine.name}
                      type="button"
                      className={`group rounded-3xl border border-white/10 bg-slate-900/80 p-4 text-left transition duration-300 hover:border-cyan-400/30 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40`}
                      aria-label={`${machine.name}, status ${machine.status}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{machine.name}</p>
                          <p className="mt-2 text-sm text-slate-400">{machine.state}</p>
                        </div>
                        <span className={`h-3.5 w-3.5 rounded-full ${machine.variant === 'success' ? 'bg-emerald-400' : machine.variant === 'warning' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-2">
                        <span className={`rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${machine.variant === 'success' ? 'bg-emerald-500/10 text-emerald-200' : machine.variant === 'warning' ? 'bg-amber-500/10 text-amber-200' : 'bg-rose-500/10 text-rose-200'}`}>
                          {machine.status}
                        </span>
                        <span className="text-xs text-slate-500">Live</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                <p className="text-sm font-semibold text-white">Overlay legend</p>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-emerald-400" />
                    <span>Running / green zone</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    <span>Waiting / needs attention</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-rose-400" />
                    <span>Quality hold / intervention required</span>
                  </div>
                </div>
                <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-400">
                  <p className="font-semibold text-white">Live overlay status</p>
                  <p className="mt-2 leading-6">Production line overlays are showing machine state, active alerts, and current dispatch readiness across the shop floor.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-lg p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-100">AI Insights</h3>
                <p className="mt-1 text-sm text-slate-400">Insight-driven alerts prioritized by production impact and risk.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-semibold text-slate-200">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
                {AI_INSIGHTS.length} active signals
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
              <p>Signals ranked by production impact, delay risk, and quality confidence.</p>
            </div>

            <div className="mt-5 grid gap-3" aria-label="AI insights">
              {AI_INSIGHTS.map((insight, index) => (
                <motion.div
                  key={insight.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.08 }}
                  whileHover={{ y: -2 }}
                  className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 transition hover:border-cyan-400/20"
                  role="article"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-900/80 text-white">
                      <insight.icon
                        className="w-5 h-5"
                        style={{ color: insight.color === 'warning' ? 'var(--color-warning)' : insight.color === 'success' ? 'var(--color-success)' : 'var(--color-accent)' }}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="truncate text-sm font-semibold text-white">{insight.title}</p>
                        <span
                          className={`rounded-full px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${
                            insight.color === 'warning'
                              ? 'bg-amber-500/10 text-amber-200'
                              : insight.color === 'success'
                              ? 'bg-emerald-500/10 text-emerald-200'
                              : 'bg-cyan-500/10 text-cyan-200'
                          }`}
                        >
                          {insight.color === 'warning' ? 'Risk' : insight.color === 'success' ? 'Positive' : 'Signal'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{insight.subtitle}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-lg p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-100">AI Recommendations</h3>
                <p className="mt-1 text-sm text-slate-400">Priority actions to reduce cycle time and minimize risk.</p>
              </div>
              <button type="button" className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/15 transition">
                View all
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {AI_RECOMMENDATIONS.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 + index * 0.08 }}
                  className="group rounded-3xl border border-white/10 bg-slate-950/70 p-4 transition hover:bg-slate-900/80"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.description}</p>
                    </div>
                    <span className="rounded-full bg-white/5 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-300">
                      {item.badge}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">Why these suggestions matter</p>
              <ul className="mt-3 space-y-2 text-slate-400">
                <li>• Rebalancing production load reduces idle time and improves throughput.</li>
                <li>• Early material approvals avoid hold-ups in the dispatch pipeline.</li>
                <li>• Proactive quality sweeps prevent overdue CAPAs that delay delivery.</li>
              </ul>
            </div>
          </div>
        </div>

          <div>
            <div className="glass-panel rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                  <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>Activity Feed</h3>
                </div>
              </div>
              <div className="space-y-3">
                {RECENT_ACTIVITIES.map((activity, i) => (
                  <div key={`${refreshTick}-${i}`} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: 'var(--color-accent)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: 'var(--color-text)' }}>{activity.title}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>By {activity.user}</p>
                    </div>
                    <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
