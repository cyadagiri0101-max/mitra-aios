import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import { Clock, FolderKanban, FileText, Activity, Truck, ShieldAlert, Wallet } from 'lucide-react';
import { HeroSection } from '../components/Dashboard/HeroSection';
import { KpiCard } from '../components/KpiCard';
import {
  buildWorkflowStages,
  summarizeDashboard,
  mapOutboxEvents,
  humanizeEventType,
  formatINR,
  DASHBOARD_REFRESH_MS,
  DASHBOARD_REFRESH_LABEL,
  type DashboardSummary,
  type WorkflowStage,
} from '../utils/dashboardMapping';
import {
  ROUTE_PROJECTS,
  ROUTE_DISPATCH,
  ROUTE_CAPA,
  ROUTE_QUOTATIONS,
  ROUTE_QUALITY,
} from '../utils/routeManifest';

const STAGE_DESCRIPTIONS: Record<string, string> = {
  ENQUIRY: 'Customer enquiries in the commercial pipeline.',
  QUOTATION: 'Quotations under preparation or review.',
  APPROVAL: 'Quotations awaiting approval.',
  PROJECT_CREATED: 'Approved work registered as projects.',
  DESIGN_INITIATED: 'Design work initiated.',
  CPS_APPROVED: 'Concept / preliminary design approved.',
  DESIGN_RELEASED: 'Designs released to manufacturing planning.',
  PROCESS_PLANNING: 'Process planning in progress.',
  MACHINE_PLANNING: 'Machine and workstation planning in progress.',
  MANUFACTURING: 'Projects in manufacturing.',
  INTERNAL_TRIAL: 'Internal trial runs in progress.',
  CUSTOMER_TRIAL: 'Customer trial runs in progress.',
  CAPA: 'Projects with an active CAPA.',
  RETRIAL: 'Retrial in progress.',
  CUSTOMER_APPROVAL: 'Awaiting customer approval.',
  DISPATCH: 'Projects awaiting dispatch.',
  SERVICE: 'Projects in service or installation.',
};

function WorkflowTimeline({
  stages,
  selectedStage,
  onSelect,
  totalProjects,
}: {
  stages: WorkflowStage[];
  selectedStage: string;
  onSelect: (stageCode: string) => void;
  totalProjects: number;
}) {
  const selectedDetails = stages.find((stage) => stage.code === selectedStage) ?? stages[0];
  const selectedIndex = stages.findIndex((stage) => stage.code === selectedDetails?.code);

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
            <p className="mt-2 text-sm text-slate-400">Live project counts per stage, from the authoritative project register.</p>
          </div>
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-cyan-200">
            <span className="text-slate-300">Total</span>
            <span className="font-mono text-white">{totalProjects}</span>
          </div>
        </div>

        {stages.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
            No project stage data available. Check the data connection or try again later.
          </div>
        ) : (
          <>
            <div className="relative overflow-x-auto py-4">
              <div className="pointer-events-none absolute left-6 right-6 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-800" />
              <div className="relative flex items-center justify-between gap-4 px-4" role="list" aria-label="workflow stages">
                {stages.map((stage, index) => {
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
                      aria-label={`Select ${stage.label} stage`}
                    >
                      <div
                        className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2"
                        style={{
                          backgroundColor: 'rgba(56, 189, 248, 0.16)',
                          borderColor: 'var(--color-accent)',
                        }}
                      >
                        <span
                          className="inline-flex h-3.5 w-3.5 rounded-full"
                          style={{ backgroundColor: 'var(--color-accent)' }}
                        />
                      </div>

                      <p className="mt-3 text-[0.76rem] leading-5 font-semibold tracking-[0.02em] text-slate-100">
                        {stage.label}
                      </p>
                      <span
                        className="mt-2 rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em]"
                        style={{
                          backgroundColor: 'rgba(56, 189, 248, 0.16)',
                          color: 'var(--color-accent)',
                          border: '1px solid rgba(56, 189, 248, 0.28)',
                        }}
                      >
                        {stage.count}
                      </span>
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
                  <span className="font-mono">{selectedDetails.count} projects</span>
                  <span className="text-slate-500">·</span>
                  <span>Stage {selectedIndex + 1} of {stages.length}</span>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                {STAGE_DESCRIPTIONS[selectedDetails.code] ?? 'Projects currently in this lifecycle stage.'}
              </p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

export function DashboardPage() {
  const [selectedStage, setSelectedStage] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/project/dashboard/stats').then((r) => r.data),
    refetchInterval: DASHBOARD_REFRESH_MS,
    retry: 2,
  });

  const { data: analytics, isLoading: isKpiLoading, isError: isAnalyticsError } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: () => api.get('/analytics/dashboard').then((r) => r.data),
    refetchInterval: DASHBOARD_REFRESH_MS,
    retry: 2,
  });

  const { data: eklWidgets, isLoading: isEklLoading } = useQuery({
    queryKey: ['knowledge-repo-stats'],
    queryFn: () => api.get('/knowledge/search', { params: { limit: 1 } }).then((r) => r.data),
    refetchInterval: DASHBOARD_REFRESH_MS,
    retry: 1,
  });

  const { data: engWidgets, isLoading: isEngLoading } = useQuery({
    queryKey: ['knowledge-repo-stats-eng'],
    queryFn: () => api.get('/knowledge/search', { params: { limit: 1, domain: 'ENGINEERING' } }).then((r) => r.data),
    refetchInterval: DASHBOARD_REFRESH_MS,
    retry: 1,
  });

  const stages = buildWorkflowStages(stats?.byStage);
  const summary: DashboardSummary | null = summarizeDashboard(analytics);
  const activeStage = selectedStage || stages[0]?.code || '';
  const outboxEvents = mapOutboxEvents(analytics?.enterpriseHealth?.eventSnapshots);
  const updatedAt = new Date().toLocaleTimeString();

  return (
    <div className="space-y-8">
      <div className="max-w-screen-xl mx-auto px-4">
        <section aria-labelledby="dashboard-overview-heading">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Dashboard overview</p>
              <h2 id="dashboard-overview-heading" className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
                Operational performance at a glance
              </h2>
            </div>
            <div className="rounded-full bg-white/5 px-4 py-2 text-sm text-slate-300 ring-1 ring-white/10">
              {DASHBOARD_REFRESH_LABEL}
            </div>
          </div>
        </section>

        <section className="mt-6" aria-labelledby="dashboard-key-metrics-heading">
          <HeroSection summary={summary} />

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6" aria-labelledby="dashboard-key-metrics-heading">
            <h3 id="dashboard-key-metrics-heading" className="sr-only">
              Key performance indicators
            </h3>
            <Link to={ROUTE_PROJECTS} className="block h-full">
              <KpiCard
                title="Active Projects"
                value={summary?.activeProjects ?? 0}
                displayValue={summary === null ? '—' : undefined}
                icon={FolderKanban}
                variant="info"
                insight={summary ? `${summary.totalProjects} total projects in pipeline` : 'Unavailable'}
                updatedAt={summary === null ? undefined : updatedAt}
                loading={isKpiLoading}
              />
            </Link>
            <Link to={ROUTE_DISPATCH} className="block h-full">
              <KpiCard
                title="In Dispatch"
                value={summary?.inDispatch ?? 0}
                displayValue={summary === null ? '—' : undefined}
                icon={Truck}
                variant="warning"
                insight="Projects awaiting shipment"
                updatedAt={summary === null ? undefined : updatedAt}
                loading={isKpiLoading}
              />
            </Link>
            <Link to={ROUTE_CAPA} className="block h-full">
              <KpiCard
                title="Open CAPAs"
                value={summary?.openCapas ?? 0}
                displayValue={summary === null ? '—' : undefined}
                icon={ShieldAlert}
                variant="danger"
                insight="From authoritative quality records"
                updatedAt={summary === null ? undefined : updatedAt}
                loading={isKpiLoading}
              />
            </Link>
            <Link to={ROUTE_QUOTATIONS} className="block h-full">
              <KpiCard
                title="Quotation Value"
                value={summary?.quotationValue ?? 0}
                displayValue={summary === null ? '—' : summary ? formatINR(summary.quotationValue) : undefined}
                icon={Wallet}
                variant="success"
                insight="Sum of non-draft, non-rejected quotations"
                updatedAt={summary === null ? undefined : updatedAt}
                loading={isKpiLoading}
              />
            </Link>
          </div>

          {isAnalyticsError && (
            <div className="mt-4 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100" role="status" aria-live="polite">
              The analytics data source could not be reached. KPI values are not displayed rather than estimated.
            </div>
          )}
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
            <WorkflowTimeline
              stages={stages}
              selectedStage={activeStage}
              onSelect={setSelectedStage}
              totalProjects={stats?.total ?? 0}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="glass-panel rounded-lg p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-100">Quality Overview</h3>
                  <p className="mt-1 text-sm text-slate-400">NCR and CAPA posture from authoritative quality records.</p>
                </div>
                <Link to={ROUTE_QUALITY} className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/15 transition">
                  Open quality register
                </Link>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-white">Open NCRs</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{summary ? summary.openNcrs : '—'}</p>
                  <p className="mt-2 text-xs text-slate-400">Non-conformance reports open</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-white">Inspection Pass Rate</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{summary ? `${summary.passRatePct}%` : '—'}</p>
                  <p className="mt-2 text-xs text-slate-400">Accepted / inspected quantity</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-white">Service Closure Rate</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{summary ? `${summary.closureRatePct}%` : '—'}</p>
                  <p className="mt-2 text-xs text-slate-400">Resolved / total service requests</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="glass-panel rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                  <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>Domain Activity</h3>
                </div>
              </div>
              {outboxEvents.length === 0 ? (
                <p className="text-sm text-slate-400">No domain events recorded for this tenant.</p>
              ) : (
                <div className="space-y-3">
                  {outboxEvents.slice(0, 6).map((event, i) => (
                    <div key={`${event.eventType}-${i}`} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: 'var(--color-accent)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm" style={{ color: 'var(--color-text)' }}>{humanizeEventType(event.eventType)}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Domain outbox event</p>
                      </div>
                      <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>{event.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}