import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Plus, Search, AlertTriangle, Factory, ClipboardList, Gauge, Boxes, SearchCheck, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

const WO_TRANSITIONS = ['START', 'PAUSE', 'RESUME', 'HOLD', 'REWORK', 'COMPLETE', 'CANCEL', 'SCRAP'];
const JOB_TRANSITIONS = ['PAUSE', 'RESUME', 'HOLD', 'REWORK', 'COMPLETE', 'CANCEL', 'SCRAP'];
const NCR_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['INVESTIGATION', 'CLOSED'],
  INVESTIGATION: ['ACTION', 'CLOSED'],
  ACTION: ['VERIFIED', 'CLOSED'],
  VERIFIED: ['CLOSED'],
};

function StatusBadge({ status }: { status?: string }) {
  const s = status?.toUpperCase().replace(/_/g, ' ');
  const cls = status === 'COMPLETED' || status === 'PASS' || status === 'VERIFIED' || status === 'CLOSED'
    ? 'bg-emerald-500/10 text-emerald-200'
    : status === 'RELEASED' || status === 'IN_PROGRESS' || status === 'ACTION' || status === 'RESERVED' || status === 'OPEN'
      ? 'bg-cyan-500/10 text-cyan-200'
      : status === 'UNDER_MAINTENANCE' || status === 'ON_HOLD' || status === 'PAUSED' || status === 'FAIL' || status === 'CRITICAL'
        ? 'bg-rose-500/10 text-rose-200'
        : status === 'REWORK' || status === 'INVESTIGATION' || status === 'MAJOR' || status === 'SHORTAGE'
          ? 'bg-amber-500/10 text-amber-200'
          : 'bg-slate-700/90 text-slate-200';
  return <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>{s}</span>;
}

function fmtDate(v?: string | null) { return v ? new Date(v).toLocaleDateString() : '-'; }

function rows(res: any): any[] {
  if (Array.isArray(res)) return res;
  const d = res?.data ?? res?.items ?? [];
  return Array.isArray(d) ? d : [];
}

// ── Dashboard ───────────────────────────────────────────────────────────────
function DashboardTab() {
  const { data: dash, isLoading } = useQuery({
    queryKey: ['mes-dashboard'],
    queryFn: () => api.get('/manufacturing/production/dashboard').then(r => r.data),
  });
  const { data: machines } = useQuery({
    queryKey: ['mes-machines'],
    queryFn: () => api.get('/manufacturing/machines').then(r => rows(r.data)),
  });

  const stats = [
    { label: 'Total WOs', value: dash?.totalWorkOrders ?? 0 },
    { label: 'In progress', value: dash?.statusCounts?.IN_PROGRESS ?? 0 },
    { label: 'Completed', value: dash?.statusCounts?.COMPLETED ?? 0 },
    { label: 'On hold', value: dash?.statusCounts?.ON_HOLD ?? 0 },
  ];
  const qty = dash?.quantities ?? {};

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-3xl border border-white/10 bg-slate-950/75 p-4">
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">{s.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="px-6 py-4"><h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Quantities</h2></CardHeader>
          <CardContent className="grid gap-2 px-6 pb-5 text-sm">
            {[['Planned', qty.planned], ['Completed', qty.completed], ['Rejected', qty.rejected], ['Rework', qty.rework], ['Scrap', qty.scrap]].map(([k, v]) => (
              <div key={k as string} className="flex justify-between border-b border-white/5 py-1.5 last:border-0">
                <span className="text-slate-400">{k}</span><span className="text-slate-100 font-medium">{Number(v ?? 0).toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-6 py-4"><h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Machines</h2></CardHeader>
          <CardContent className="px-6 pb-5">
            <div className="grid gap-2 sm:grid-cols-2">
              {machines?.map((m: any) => (
                <div key={m.id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-100 truncate">{m.machineNumber}</p>
                    <StatusBadge status={m.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-400 truncate">{m.machineName}</p>
                  {m.location && <p className="text-xs text-slate-500">{m.location}</p>}
                </div>
              ))}
              {!isLoading && !machines?.length && <p className="text-sm text-slate-400">No machines registered.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
      {isLoading && <p className="text-sm text-slate-400">Loading dashboard…</p>}
    </div>
  );
}

// ── Work Orders ─────────────────────────────────────────────────────────────
function WorkOrdersTab({ onSelectWorkOrder, selectedId }: { onSelectWorkOrder: (id: string) => void; selectedId: string | null }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['mes-work-orders'],
    queryFn: () => api.get('/manufacturing/work-orders').then(r => rows(r.data)),
    retry: 2,
    staleTime: 60_000,
  });

  const release = useMutation({
    mutationFn: (id: string) => api.post(`/manufacturing/work-orders/${id}/release`),
    onSuccess: (_d, id) => { toast.success('Work order released'); qc.invalidateQueries({ queryKey: ['mes-work-orders'] }); qc.invalidateQueries({ queryKey: ['mes-detail', id] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Release failed'),
  });

  const transition = useMutation({
    mutationFn: ({ id, transition }: { id: string; transition: string }) => api.post(`/manufacturing/work-orders/${id}/transition`, { transition }),
    onSuccess: (_d, v) => { toast.success(`Transitioned to ${v.transition}`); qc.invalidateQueries({ queryKey: ['mes-work-orders'] }); qc.invalidateQueries({ queryKey: ['mes-detail', v.id] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Transition failed'),
  });

  const filtered = workOrders?.filter((w: any) =>
    `${w.woNumber} ${w.partName ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  const detail = useQuery({
    queryKey: ['mes-detail', selectedId],
    enabled: !!selectedId,
    queryFn: () => api.get(`/manufacturing/work-orders/${selectedId}`).then(r => r.data),
  });

  const columns = [
    { key: 'woNumber', header: 'WO #', render: (w: any) => <span className="font-medium text-slate-100">{w.woNumber}</span> },
    { key: 'partName', header: 'Part' },
    { key: 'status', header: 'Status', render: (w: any) => <StatusBadge status={w.status} /> },
    { key: 'priority', header: 'Priority' },
    { key: 'qty', header: 'Qty', render: (w: any) => `${Number(w.completedQty ?? 0)} / ${Number(w.plannedQty ?? 0)}` },
    { key: 'plannedStartDate', header: 'Planned Start', render: (w: any) => fmtDate(w.plannedStartDate) },
    { key: 'actions', header: '', render: (w: any) => (
      <span className="inline-flex items-center gap-2">
        {w.status === 'DRAFT' && (
          <button className="btn-primary !px-3 !py-1 text-xs" onClick={(e) => { e.stopPropagation(); release.mutate(w.id); }}>Release</button>
        )}
        {w.status === 'COMPLETED' || w.status === 'CANCELLED' || w.status === 'SCRAPPED' ? null : w.status !== 'DRAFT' && (
          <select
            value=""
            onChange={(e) => { e.stopPropagation(); if (e.target.value) transition.mutate({ id: w.id, transition: e.target.value }); }}
            className="rounded-lg border border-white/10 bg-slate-900 text-xs px-2 py-1 text-slate-200"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Transition ${w.woNumber}`}
          >
            <option value="" disabled>Transition…</option>
            {WO_TRANSITIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </span>
    )},
  ];

  return (
    <Card>
      <CardHeader className="px-6 py-4">
        <div className="flex items-center gap-4">
          <Search className="w-5 h-5 text-slate-400" />
          <input type="text" aria-label="Search work orders" placeholder="Search work orders…" value={search}
            onChange={e => setSearch(e.target.value)} className="flex-1 input-field bg-slate-950/70 border-white/10 text-slate-100" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <DataTable columns={columns} data={filtered || []} loading={isLoading}
          onRowClick={(w) => onSelectWorkOrder(w.id)} />
        {selectedId && detail.data && (
          <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{detail.data.woNumber}</h3>
                <p className="text-sm text-slate-400">{detail.data.partName} · {detail.data.operationType}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={detail.data.status} />
                {detail.data.priority && <StatusBadge status={detail.data.priority} />}
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Quantities</p>
                <p className="mt-1 text-slate-200">Done {Number(detail.data.completedQty ?? 0)} / {Number(detail.data.plannedQty ?? 0)} · Rework {Number(detail.data.reworkQty ?? 0)} · Scrap {Number(detail.data.scrapQty ?? 0)}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Schedule</p>
                <p className="mt-1 text-slate-200">{fmtDate(detail.data.plannedStartDate)} → {fmtDate(detail.data.plannedEndDate)}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Baseline</p>
                <p className="mt-1 text-slate-200">{detail.data.releasedAt ? `Released ${fmtDate(detail.data.releasedAt)}` : 'Not released'} · Hours {Number(detail.data.actualHours ?? 0)}/{Number(detail.data.estimatedHours ?? 0)}</p>
              </div>
            </div>
            {detail.data.snapshot && (
              <p className="mt-3 text-xs text-slate-500">
                Snapshot: drawing rev {detail.data.snapshot.drawingRevision ?? detail.data.drawingRevision ?? '-'} · cost baseline {Number(detail.data.costBaseline ?? 0).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Shop Floor ──────────────────────────────────────────────────────────────
function ShopFloorTab() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [log, setLog] = useState({ qtyProduced: '', qtyRejected: '', durationMinutes: '', remarks: '' });

  const { data: jobCards, isLoading } = useQuery({
    queryKey: ['mes-jobcards', status],
    queryFn: () => api.get('/manufacturing/job-cards', { params: status ? { status } : {} }).then(r => rows(r.data)),
  });

  const start = useMutation({
    mutationFn: (id: string) => api.post(`/manufacturing/job-cards/${id}/start`, {}),
    onSuccess: (_d, id) => { toast.success('Job started'); invalidate(id); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Start failed'),
  });
  const production = useMutation({
    mutationFn: ({ id, qtyProduced, qtyRejected, durationMinutes, remarks }: any) =>
      api.post(`/manufacturing/job-cards/${id}/production`, {
        qtyProduced: Number(qtyProduced || 0), qtyRejected: Number(qtyRejected || 0),
        durationMinutes: Number(durationMinutes || 0), remarks,
      }),
    onSuccess: (_d, v) => { toast.success('Production logged'); setExpanded(null); setLog({ qtyProduced: '', qtyRejected: '', durationMinutes: '', remarks: '' }); invalidate(v.id); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Log failed'),
  });
  const transition = useMutation({
    mutationFn: ({ id, transition, holdReason }: any) => api.post(`/manufacturing/job-cards/${id}/transition`, { transition, holdReason }),
    onSuccess: (_d, v) => { toast.success(`Job ${v.transition.toLowerCase()}`); invalidate(v.id); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Transition failed'),
  });

  function invalidate(id: string) {
    qc.invalidateQueries({ queryKey: ['mes-jobcards'] });
    qc.invalidateQueries({ queryKey: ['mes-detail'] });
    if (id) qc.invalidateQueries({ queryKey: ['mes-jobcard', id] });
  }

  const columns = [
    { key: 'jobCardNumber', header: 'Job Card', render: (j: any) => <span className="font-medium text-slate-100">{j.jobCardNumber}</span> },
    { key: 'op', header: 'Op', render: (j: any) => <span className="text-slate-400">{j.operationNumber} · {j.operationCode ?? '-'}</span> },
    { key: 'machineId', header: 'Machine', render: (j: any) => j.machineId ? j.machineId.slice(0, 8) : '-' },
    { key: 'qty', header: 'Qty', render: (j: any) => `${Number(j.producedQty ?? 0)} / ${Number(j.qtyPlanned ?? 1)}` },
    { key: 'hours', header: 'Hours', render: (j: any) => `${Number(j.actualHours ?? 0)}/${Number(j.plannedHours ?? 0)}` },
    { key: 'status', header: 'Status', render: (j: any) => <StatusBadge status={j.status} /> },
    { key: 'actions', header: '', render: (j: any) => (
      <span className="inline-flex items-center gap-2">
        {j.status === 'OPEN' && <button className="btn-primary !px-3 !py-1 text-xs" onClick={(e) => { e.stopPropagation(); start.mutate(j.id); }}>Start</button>}
        {j.status === 'IN_PROGRESS' && <button className="btn-ghost !px-3 !py-1 text-xs" onClick={(e) => { e.stopPropagation(); setExpanded(expanded === j.id ? null : j.id); setLog({ qtyProduced: String(j.producedQty ?? ''), qtyRejected: '', durationMinutes: '', remarks: '' }); }}>Log</button>}
        {j.status !== 'COMPLETED' && j.status !== 'CANCELLED' && j.status !== 'SCRAPPED' && j.status !== 'OPEN' && (
          <select value="" onChange={(e) => { e.stopPropagation(); if (e.target.value) transition.mutate({ id: j.id, transition: e.target.value }); }}
            className="rounded-lg border border-white/10 bg-slate-900 text-xs px-2 py-1 text-slate-200" onClick={(e) => e.stopPropagation()}
            aria-label={`Transition ${j.jobCardNumber}`}>
            <option value="" disabled>Transition…</option>
            {JOB_TRANSITIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </span>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={status} onChange={e => setStatus(e.target.value)} className="input-field !w-56 bg-slate-950/70 border-white/10 text-slate-100" aria-label="Filter by status">
          <option value="">All statuses</option>
          {['OPEN', 'IN_PROGRESS', 'PAUSED', 'ON_HOLD', 'REWORK', 'COMPLETED', 'CANCELLED', 'SCRAPPED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-slate-500">{jobCards?.length ?? 0} job cards</span>
      </div>
      <Card>
        <CardContent className="p-4">
          <DataTable columns={columns} data={jobCards || []} loading={isLoading} />
        </CardContent>
      </Card>
      {expanded && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-3">Log production</h3>
          <div className="grid gap-3 sm:grid-cols-4">
            <input type="number" placeholder="Qty produced" value={log.qtyProduced} aria-label="Qty produced"
              onChange={e => setLog({ ...log, qtyProduced: e.target.value })} className="input-field bg-slate-950/70 border-white/10 text-slate-100" />
            <input type="number" placeholder="Qty rejected" value={log.qtyRejected} aria-label="Qty rejected"
              onChange={e => setLog({ ...log, qtyRejected: e.target.value })} className="input-field bg-slate-950/70 border-white/10 text-slate-100" />
            <input type="number" placeholder="Duration (min)" value={log.durationMinutes} aria-label="Duration minutes"
              onChange={e => setLog({ ...log, durationMinutes: e.target.value })} className="input-field bg-slate-950/70 border-white/10 text-slate-100" />
            <input type="text" placeholder="Remarks" value={log.remarks} aria-label="Remarks"
              onChange={e => setLog({ ...log, remarks: e.target.value })} className="input-field bg-slate-950/70 border-white/10 text-slate-100" />
          </div>
          <button className="btn-primary mt-4" disabled={production.isPending}
            onClick={() => production.mutate({ id: expanded, ...log })}>Save production</button>
        </div>
      )}
    </div>
  );
}

// ── Machines + Scheduling ───────────────────────────────────────────────────
function MachinesTab() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const { data: machines, isLoading } = useQuery({
    queryKey: ['mes-machines'],
    queryFn: () => api.get('/manufacturing/machines').then(r => rows(r.data)),
  });
  const { data: queue } = useQuery({
    queryKey: ['mes-queue', selected],
    enabled: !!selected,
    queryFn: () => api.get(`/manufacturing/machines/${selected}/queue`).then(r => r.data),
  });
  const { data: utilization } = useQuery({
    queryKey: ['mes-utilization', selected],
    enabled: !!selected,
    queryFn: () => api.get(`/manufacturing/machines/${selected}/utilization`).then(r => r.data),
  });
  const maintenance = useMutation({
    mutationFn: ({ id, maintenance }: any) => api.patch(`/manufacturing/machines/${id}/maintenance`, { maintenance }),
    onSuccess: (_d, v) => { toast.success(v.maintenance ? 'Machine marked for maintenance' : 'Maintenance cleared'); qc.invalidateQueries({ queryKey: ['mes-machines'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Update failed'),
  });
  const assign = useMutation({
    mutationFn: ({ jobId, machineId }: any) => api.post('/manufacturing/scheduling/assign', { jobId, machineId }),
    onSuccess: (_d, v) => { toast.success('Job assigned'); qc.invalidateQueries({ queryKey: ['mes-queue', v.machineId] }); qc.invalidateQueries({ queryKey: ['mes-jobcards'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Assign failed'),
  });

  const columns = [
    { key: 'machineNumber', header: 'Machine', render: (m: any) => <span className="font-medium text-slate-100">{m.machineNumber}</span> },
    { key: 'machineName', header: 'Name' },
    { key: 'location', header: 'Location', render: (m: any) => m.location ?? '-' },
    { key: 'status', header: 'Status', render: (m: any) => <StatusBadge status={m.status} /> },
    { key: 'lastMaintenanceDate', header: 'Last Maint.', render: (m: any) => fmtDate(m.lastMaintenanceDate) },
    { key: 'nextMaintenanceDate', header: 'Next Maint.', render: (m: any) => fmtDate(m.nextMaintenanceDate) },
    { key: 'actions', header: '', render: (m: any) => (
      <span className="inline-flex items-center gap-2">
        <button className="btn-ghost !px-3 !py-1 text-xs" onClick={(e) => { e.stopPropagation(); setSelected(selected === m.id ? null : m.id); }}>Queue</button>
        <button className="btn-ghost !px-3 !py-1 text-xs" onClick={(e) => { e.stopPropagation(); maintenance.mutate({ id: m.id, maintenance: m.status !== 'UNDER_MAINTENANCE' }); }}>
          {m.status === 'UNDER_MAINTENANCE' ? 'Clear maint.' : 'Maintenance'}
        </button>
      </span>
    )},
  ];

  const queueItems = queue?.data ?? queue?.items ?? (Array.isArray(queue) ? queue : []);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <DataTable columns={columns} data={machines || []} loading={isLoading} />
        </CardContent>
      </Card>
      {selected && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="px-6 py-4"><h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Queue</h2></CardHeader>
            <CardContent className="px-6 pb-5">
              {utilization && (
                <p className="mb-3 text-xs text-slate-400">Utilization (30d): {Number(utilization.utilizationPct ?? utilization.utilizedHours ?? 0).toFixed(1)}% · bookings {utilization.totalBookedHours ?? '-'}h</p>
              )}
              <div className="space-y-2">
                {queueItems?.length ? queueItems.map((j: any, i: number) => (
                  <div key={j.id ?? i} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <div className="text-sm">
                      <p className="text-slate-100 font-medium">{j.jobCardNumber ?? j.woNumber ?? 'Job'}</p>
                      <p className="text-xs text-slate-500">{j.partName ?? j.operationCode ?? ''} · {j.priority ?? ''}</p>
                    </div>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={j.status ?? j.cardStatus} />
                      {!j.machineId && <button className="btn-primary !px-3 !py-1 text-xs" onClick={() => assign.mutate({ jobId: j.id, machineId: selected })}>Assign</button>}
                    </span>
                  </div>
                )) : <p className="text-sm text-slate-400">No queued jobs.</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="px-6 py-4"><h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Bookings</h2></CardHeader>
            <CardContent className="px-6 pb-5">
              <QueueBookings machineId={selected} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function QueueBookings({ machineId }: { machineId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['mes-bookings', machineId],
    queryFn: () => api.get(`/manufacturing/machines/${machineId}/bookings`).then(r => rows(r.data)),
  });
  if (isLoading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (!data?.length) return <p className="text-sm text-slate-400">No bookings.</p>;
  return (
    <div className="space-y-2">
      {data.map((b: any) => (
        <div key={b.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-sm">
          <div>
            <p className="text-slate-100 font-medium">{b.bookingNumber}</p>
            <p className="text-xs text-slate-500">{fmtDate(b.startDatetime)} → {fmtDate(b.endDatetime)}</p>
          </div>
          <StatusBadge status={b.status} />
        </div>
      ))}
    </div>
  );
}

// ── Materials ───────────────────────────────────────────────────────────────
function MaterialsTab() {
  const qc = useQueryClient();
  const [workOrderId, setWorkOrderId] = useState('');
  const { data: reservations, isLoading } = useQuery({
    queryKey: ['mes-reservations', workOrderId],
    queryFn: () => api.get('/manufacturing/materials/reservations', { params: workOrderId ? { workOrderId } : {} }).then(r => rows(r.data)),
  });
  const { data: shortages } = useQuery({
    queryKey: ['mes-shortages'],
    queryFn: () => api.get('/manufacturing/materials/shortages').then(r => rows(r.data)),
  });
  const issue = useMutation({
    mutationFn: (id: string) => api.post(`/manufacturing/materials/reservations/${id}/issue`, {}),
    onSuccess: (_d, id) => { toast.success('Material issued'); qc.invalidateQueries({ queryKey: ['mes-reservations'] }); qc.invalidateQueries({ queryKey: ['mes-shortages'] }); void id; },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Issue failed'),
  });
  const releaseUnused = useMutation({
    mutationFn: (id: string) => api.post(`/manufacturing/materials/reservations/${id}/release-unused`, {}),
    onSuccess: (_d, id) => { toast.success('Unused material released'); qc.invalidateQueries({ queryKey: ['mes-reservations'] }); void id; },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Release failed'),
  });

  const columns = [
    { key: 'reservationNumber', header: 'Reservation', render: (r: any) => <span className="font-medium text-slate-100">{r.reservationNumber}</span> },
    { key: 'partNumber', header: 'Part' },
    { key: 'partName', header: 'Name' },
    { key: 'qty', header: 'Qty', render: (r: any) => `${Number(r.issuedQty ?? 0)} / ${Number(r.reservedQty ?? 0)} ${r.uom ?? ''}` },
    { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'storeLocation', header: 'Store', render: (r: any) => r.storeLocation ?? '-' },
    { key: 'actions', header: '', render: (r: any) => (
      <span className="inline-flex gap-2">
        {r.status === 'RESERVED' && <button className="btn-primary !px-3 !py-1 text-xs" onClick={(e) => { e.stopPropagation(); issue.mutate(r.id); }}>Issue</button>}
        {r.status === 'RESERVED' && <button className="btn-ghost !px-3 !py-1 text-xs" onClick={(e) => { e.stopPropagation(); releaseUnused.mutate(r.id); }}>Release</button>}
      </span>
    )},
  ];

  return (
    <div className="space-y-4">
      {(shortages?.length ?? 0) > 0 && (
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="flex items-center gap-2 font-medium"><AlertTriangle className="w-4 h-4" /> {shortages!.length} material shortage{shortages!.length > 1 ? 's' : ''}</div>
          <p className="mt-1 text-xs text-amber-200">{shortages!.slice(0, 5).map((s: any) => `${s.partNumber} (${s.shortageQty ?? s.uom ?? ''})`).join(', ')}{shortages!.length > 5 ? '…' : ''}</p>
        </div>
      )}
      <input type="text" placeholder="Filter by work order id" value={workOrderId} aria-label="Filter by work order"
        onChange={e => setWorkOrderId(e.target.value)} className="input-field !w-80 bg-slate-950/70 border-white/10 text-slate-100" />
      <Card>
        <CardContent className="p-4">
          <DataTable columns={columns} data={reservations || []} loading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Inspection + NCR ────────────────────────────────────────────────────────
function InspectionTab() {
  const qc = useQueryClient();
  const [workOrderId, setWorkOrderId] = useState('');
  const [result, setResult] = useState({ status: 'PASS', measuredValue: '', remarks: '' });
  const { data: checkpoints, isLoading } = useQuery({
    queryKey: ['mes-checkpoints', workOrderId],
    enabled: !!workOrderId,
    queryFn: () => api.get(`/manufacturing/inspection/checkpoints/${workOrderId}`).then(r => rows(r.data)),
  });
  const { data: summary } = useQuery({
    queryKey: ['mes-inspection-summary', workOrderId],
    enabled: !!workOrderId,
    queryFn: () => api.get(`/manufacturing/inspection/summary/${workOrderId}`).then(r => r.data),
  });
  const { data: ncrs } = useQuery({
    queryKey: ['mes-ncrs'],
    queryFn: () => api.get('/quality/ncr').then(r => rows(r.data)),
  });
  const record = useMutation({
    mutationFn: (id: string) => api.post(`/manufacturing/inspection/checkpoints/${id}/result`, {
      status: result.status, measuredValue: result.measuredValue || undefined, remarks: result.remarks || undefined,
    }),
    onSuccess: () => { toast.success(`Checkpoint ${result.status.toLowerCase()}`); qc.invalidateQueries({ queryKey: ['mes-checkpoints'] }); qc.invalidateQueries({ queryKey: ['mes-inspection-summary'] }); qc.invalidateQueries({ queryKey: ['mes-ncrs'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Record failed'),
  });
  const ncrTransition = useMutation({
    mutationFn: ({ id, toStatus }: any) => api.patch(`/quality/ncr/${id}/transition`, { toStatus }),
    onSuccess: (_d, v) => { toast.success(`NCR → ${v.toStatus}`); qc.invalidateQueries({ queryKey: ['mes-ncrs'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'NCR transition failed'),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="px-6 py-4"><h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Checkpoints</h2></CardHeader>
          <CardContent className="px-6 pb-5 space-y-3">
            <input type="text" placeholder="Work order id (uuid)" value={workOrderId} aria-label="Work order id"
              onChange={e => setWorkOrderId(e.target.value)} className="input-field bg-slate-950/70 border-white/10 text-slate-100" />
            {summary && (
              <p className="text-xs text-slate-400">Summary: {Number(summary.passed ?? 0)} passed · {Number(summary.failed ?? 0)} failed · {Number(summary.pending ?? 0)} pending</p>
            )}
            <div className="space-y-2">
              {checkpoints?.length ? checkpoints.map((c: any) => (
                <div key={c.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <p className="text-slate-100 font-medium">{c.checkpointNumber} · {c.checkpointName ?? '-'} {c.isCritical && <span className="text-rose-300 text-xs">CRITICAL</span>}</p>
                      <p className="text-xs text-slate-500">Op {c.operationNumber ?? '-'}{c.measuredValue ? ` · measured ${c.measuredValue}` : ''}{c.inspectedAt ? ` · ${fmtDate(c.inspectedAt)}` : ''}</p>
                    </div>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={c.status} />
                      {c.status === 'PENDING' && (
                        <span className="flex items-center gap-1">
                          <select value={result.status} onChange={e => setResult({ ...result, status: e.target.value })}
                            className="rounded-lg border border-white/10 bg-slate-900 text-xs px-1.5 py-1 text-slate-200" aria-label="Checkpoint result">
                            <option value="PASS">PASS</option><option value="FAIL">FAIL</option>
                          </select>
                          <button className="btn-primary !px-3 !py-1 text-xs" onClick={() => record.mutate(c.id)}>Record</button>
                        </span>
                      )}
                    </span>
                  </div>
                  {c.status === 'PENDING' && (
                    <input type="text" placeholder="Measured value" value={result.measuredValue}
                      onChange={e => setResult({ ...result, measuredValue: e.target.value })} className="input-field mt-2 !text-xs bg-slate-950/70 border-white/10 text-slate-100" aria-label="Measured value" />
                  )}
                </div>
              )) : <p className="text-sm text-slate-400">Enter a work order id to load checkpoints.</p>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-6 py-4"><h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Non-Conformances (NCR)</h2></CardHeader>
          <CardContent className="px-6 pb-5">
            <div className="space-y-2">
              {ncrs?.length ? ncrs.map((n: any) => (
                <div key={n.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <p className="text-slate-100 font-medium">{n.ncrNumber}</p>
                      <p className="text-xs text-slate-500">{n.description?.slice(0, 90)}{n.description?.length > 90 ? '…' : ''}</p>
                    </div>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={n.status} />
                      {n.severity && <StatusBadge status={n.severity} />}
                    </span>
                  </div>
                  {n.status !== 'CLOSED' && (
                    <div className="mt-2">
                      <select value="" onChange={e => { if (e.target.value) ncrTransition.mutate({ id: n.id, toStatus: e.target.value }); }}
                        className="rounded-lg border border-white/10 bg-slate-900 text-xs px-2 py-1 text-slate-200" aria-label={`Transition ${n.ncrNumber}`}>
                        <option value="" disabled>Transition…</option>
                        {(NCR_TRANSITIONS[n.status] ?? []).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )) : <p className="text-sm text-slate-400">No non-conformances.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: Gauge },
  { key: 'workorders', label: 'Work Orders', icon: ClipboardList },
  { key: 'shopfloor', label: 'Shop Floor', icon: Factory },
  { key: 'machines', label: 'Machines', icon: Settings },
  { key: 'materials', label: 'Materials', icon: Boxes },
  { key: 'inspection', label: 'Inspection & NCR', icon: SearchCheck },
];

export function ManufacturingPage() {
  const [tab, setTab] = useState('dashboard');
  const [selectedWo, setSelectedWo] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Manufacturing</h1>
          <p className="mt-2 text-sm text-slate-400">MES console: work-order engine, shop floor execution, machines, materials, inspection.</p>
        </div>
        <button className="btn-primary" onClick={() => toast('Work orders are generated from released engineering artifacts via the API.')}>
          <Plus className="w-4 h-4 mr-2" /> New Work Order
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-400/30' : 'text-slate-300 border border-white/10 hover:bg-slate-900/70'}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'workorders' && <WorkOrdersTab onSelectWorkOrder={(id) => { setSelectedWo(id); setTab('shopfloor'); }} selectedId={selectedWo} />}
      {tab === 'shopfloor' && <ShopFloorTab />}
      {tab === 'machines' && <MachinesTab />}
      {tab === 'materials' && <MaterialsTab />}
      {tab === 'inspection' && <InspectionTab />}
    </div>
  );
}
