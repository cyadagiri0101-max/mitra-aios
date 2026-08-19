import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProjectServiceLineage } from '../utils/serviceApi';
import { describeWarrantyCoverage } from '../utils/serviceStatus';
import { StatusBadge, fmtDate, fmtMoney, KpiTile, SectionCard } from './service/ui';
import {
  ArrowLeft, FolderKanban, Truck, ClipboardCheck, ShieldCheck, Wrench, Timer, Scale,
  ChevronRight, ExternalLink,
} from 'lucide-react';
import { api } from '../utils/api';

interface LineageData {
  projectId: string;
  projectName?: string;
  projectCode?: string;
  dispatches: any[];
  installations: any[];
  warranties: any[];
  serviceRequests: any[];
  visits: any[];
  claims: any[];
  metrics: {
    totalDispatches: number;
    deliveredDispatches: number;
    totalInstallations: number;
    completedInstallations: number;
    activeWarranties: number;
    totalServiceRequests: number;
    openServiceRequests: number;
    resolvedServiceRequests: number;
    totalVisits: number;
    totalClaims: number;
    approvedClaims: number;
  };
}

interface SectionDef {
  key: keyof Pick<LineageData, 'dispatches' | 'installations' | 'warranties' | 'serviceRequests' | 'visits' | 'claims'>;
  label: string;
  icon: typeof FolderKanban;
  render: (item: any, i: number) => React.ReactNode;
}

function ProjectSelector({ currentId, onSelect }: { currentId: string; onSelect: (id: string) => void }) {
  const { data } = useQuery({
    queryKey: ['projects-dropdown'],
    queryFn: () => api.get('/project', { params: { limit: 100 } }).then(r => {
      const p = r.data;
      const items = Array.isArray(p) ? p : (p?.data ?? []);
      return items.map((x: any) => ({ id: x.id, name: x.name, code: x.projectNumber }));
    }),
    retry: 2, staleTime: 5 * 60 * 1000,
  });
  return (
    <select
      value={currentId}
      onChange={e => onSelect(e.target.value)}
      className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 max-w-xs"
      aria-label="Select project for service lineage"
    >
      <option value="" disabled>Select project…</option>
      {(data ?? []).map((p: any) => (
        <option key={p.id} value={p.id}>{p.code ?? ''} — {p.name}</option>
      ))}
    </select>
  );
}

export function ServiceLineagePage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(projectId);

  const query = useQuery({
    queryKey: ['project-service-lineage', selectedId],
    queryFn: () => getProjectServiceLineage(selectedId).then(r => r.data as LineageData),
    enabled: !!selectedId,
    retry: 2, staleTime: 60 * 1000,
  });

  const data = query.data;

  const sections: SectionDef[] = useMemo(() => [
    {
      key: 'dispatches', label: 'Dispatch', icon: Truck,
      render: (d: any) => (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs text-slate-300 truncate">{d.dispatchNumber}</span>
            <span className="text-slate-500 text-xs">→ {d.customerName ?? '—'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500">Planned {fmtDate(d.plannedDate)} · Shipped {fmtDate(d.shippedDate)} · Delivered {fmtDate(d.deliveredDate)}</span>
            <StatusBadge status={d.status} />
          </div>
        </div>
      ),
    },
    {
      key: 'installations', label: 'Installation', icon: ClipboardCheck,
      render: (i: any) => (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs text-slate-300 truncate">{i.installationNumber}</span>
            {i.signoffBy && <span className="text-slate-500 text-xs truncate">signoff: {i.signoffBy}</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500">Scheduled {fmtDate(i.installationDate)} · Completed {fmtDate(i.completionDate)}</span>
            <StatusBadge status={i.status} />
          </div>
        </div>
      ),
    },
    {
      key: 'warranties', label: 'Warranty', icon: ShieldCheck,
      render: (w: any) => {
        const coverage = describeWarrantyCoverage(w);
        return (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-xs text-slate-300 truncate">{w.warrantyNumber}</span>
              <span className="text-[10px] text-slate-500">{w.coverageMonths ?? '—'} months · {w.maxCycles ?? '—'} max cycles · {(w.currentCycles ?? 0).toLocaleString()} used</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-500">{fmtDate(w.warrantyStartDate)} → {fmtDate(w.warrantyEndDate)}</span>
              <StatusBadge status={w.status} />
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                coverage.state === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' :
                coverage.state === 'EXPIRED' ? 'bg-rose-500/15 text-rose-300 border-rose-500/40' :
                coverage.state === 'CYCLE_LIMIT_EXHAUSTED' ? 'bg-amber-500/15 text-amber-300 border-amber-500/40' :
                'bg-slate-500/15 text-slate-300 border-slate-500/40'
              }`}>{coverage.state.replace(/_/g, ' ')}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'serviceRequests', label: 'Service Request', icon: Wrench,
      render: (r: any) => (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs text-slate-300 truncate">{r.srNumber}</span>
            <span className="text-slate-500 text-xs truncate">{r.customerName ?? '—'}</span>
            <span className="text-[10px] text-slate-500">{r.priority ?? '—'} · {r.serviceType ?? '—'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500">Reported {fmtDate(r.reportedDate)}</span>
            <StatusBadge status={r.status} />
          </div>
        </div>
      ),
    },
    {
      key: 'visits', label: 'Service Visit', icon: Timer,
      render: (v: any) => (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs text-slate-300 truncate">{v.visitNumber}</span>
            <span className="text-slate-500 text-xs truncate">tech {v.technicianId ? `${v.technicianId.slice(0, 8)}…` : '—'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500">{fmtDate(v.visitDate)} · {(Number(v.travelHours ?? 0) + Number(v.serviceHours ?? 0)).toFixed(1)} h effort</span>
            <StatusBadge status={v.status} />
          </div>
        </div>
      ),
    },
    {
      key: 'claims', label: 'Warranty Claim', icon: Scale,
      render: (c: any) => (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs text-slate-300 truncate">{c.claimNumber}</span>
            <span className="text-slate-500 text-xs truncate">{c.issueSummary ?? ''}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500">
              {fmtDate(c.claimDate)} · Claimed {fmtMoney(c.claimAmount)} · Approved {fmtMoney(c.approvedAmount)}
            </span>
            <StatusBadge status={c.status} />
          </div>
        </div>
      ),
    },
  ], []);

  const metrics = data?.metrics;
  const counts = {
    dispatches: data?.dispatches.length ?? 0,
    installations: data?.installations.length ?? 0,
    warranties: data?.warranties.length ?? 0,
    serviceRequests: data?.serviceRequests.length ?? 0,
    visits: data?.visits.length ?? 0,
    claims: data?.claims.length ?? 0,
  };

  return (
    <div className="space-y-6">
      <Link to={selectedId ? `/projects/${selectedId}` : '/projects'} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back to project
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Project Service Digital Thread</h1>
          <p className="text-sm text-slate-400 mt-1">
            Project → Dispatch → Installation → Warranty → Service Request → Service Visit → Warranty Claim
          </p>
        </div>
        <ProjectSelector currentId={selectedId} onSelect={(id) => { setSelectedId(id); navigate(`/service/lineage/${id}`, { replace: true }); }} />
      </div>

      {query.isLoading && (
        <SectionCard title="Loading lineage…"><p className="text-sm text-slate-400">Fetching the digital thread from the backend…</p></SectionCard>
      )}

      {query.isError && !query.isLoading && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-sm text-rose-300 flex items-center gap-2">
          Failed to load lineage: {(query.error as any)?.response?.data?.message ?? 'Unknown error'}
        </div>
      )}

      {data && (
        <>
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5">
            <div className="flex items-center gap-3 flex-wrap">
              <FolderKanban className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">{data.projectName ?? 'Project'}</h2>
              {data.projectCode && <span className="text-xs font-mono text-slate-400">{data.projectCode}</span>}
              <span className="text-xs font-mono text-slate-500">{data.projectId}</span>
              <Link to={`/projects/${data.projectId}`} className="ml-auto text-xs text-blue-300 hover:text-blue-200 inline-flex items-center gap-1">
                Open project <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <KpiTile label="Dispatches" value={`${metrics?.totalDispatches ?? 0}`} tone="text-slate-200" hint={`${metrics?.deliveredDispatches ?? 0} delivered`} />
            <KpiTile label="Installations" value={`${metrics?.totalInstallations ?? 0}`} tone="text-slate-200" hint={`${metrics?.completedInstallations ?? 0} completed`} />
            <KpiTile label="Warranties" value={`${metrics?.activeWarranties ?? 0}`} tone="text-emerald-300" hint="active" />
            <KpiTile label="Service Requests" value={`${metrics?.totalServiceRequests ?? 0}`} tone="text-slate-200" hint={`${metrics?.openServiceRequests ?? 0} open · ${metrics?.resolvedServiceRequests ?? 0} resolved`} />
            <KpiTile label="Visits" value={`${metrics?.totalVisits ?? 0}`} tone="text-slate-200" hint="field visits" />
            <KpiTile label="Claims" value={`${metrics?.totalClaims ?? 0}`} tone="text-slate-200" hint={`${metrics?.approvedClaims ?? 0} approved`} />
          </div>

          <div className="relative pl-6">
            <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-800" aria-hidden="true" />
            <div className="space-y-6">
              {sections.map(section => {
                const Icon = section.icon;
                const items = data[section.key] ?? [];
                return (
                  <div key={section.key} className="relative">
                    <div className="absolute -left-[22px] top-1 w-5 h-5 rounded-full bg-slate-900 border-2 border-blue-500/60 flex items-center justify-center">
                      <Icon className="w-2.5 h-2.5 text-blue-400" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-white inline-flex items-center gap-2">
                        {section.label}
                        <span className="text-xs font-mono text-slate-500">{counts[section.key]}</span>
                      </h3>
                      {section.key === 'dispatches' && counts.dispatches > 0 && (
                        <Link to="/dispatch" className="text-[10px] text-blue-300 hover:text-blue-200 inline-flex items-center gap-0.5">
                          Open dispatch view <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                      {(section.key === 'installations' || section.key === 'serviceRequests' || section.key === 'visits' || section.key === 'warranties' || section.key === 'claims') && counts[section.key] > 0 && (
                        <Link to="/service" className="text-[10px] text-blue-300 hover:text-blue-200 inline-flex items-center gap-0.5">
                          Open service view <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                    {items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-slate-500">
                        No {section.label.toLowerCase()} records in the thread.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {items.map((item, i) => (
                          <div key={item.id ?? i} className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                            {section.render(item, i)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}