import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  Filter,
  Gauge,
  GitBranch,
  PackageCheck,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Users,
  Wrench,
} from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { KpiCard } from '../components/KpiCard';

type QmsRecord = Record<string, any>;
type QmsDataset = { data: QmsRecord[]; total: number; isLoading: boolean; isError: boolean };

type ModuleConfig = {
  key: string;
  label: string;
  shortLabel: string;
  endpoint: string;
  icon: React.ElementType;
  numberField: string;
  titleField?: string;
};

const modules: ModuleConfig[] = [
  { key: 'inspection-plans', label: 'Inspection Planning', shortLabel: 'Plans', endpoint: '/quality/inspection-plans', icon: ClipboardCheck, numberField: 'planNumber', titleField: 'title' },
  { key: 'supplier-inspections', label: 'Incoming Inspection', shortLabel: 'IQC', endpoint: '/quality/supplier-inspections', icon: Boxes, numberField: 'inspectionNumber', titleField: 'materialLot' },
  { key: 'ncr', label: 'NCR', shortLabel: 'NCR', endpoint: '/quality/ncr', icon: ShieldAlert, numberField: 'ncrNumber', titleField: 'description' },
  { key: 'control-plans', label: 'Control Plans', shortLabel: 'Control', endpoint: '/quality/control-plans', icon: ClipboardList, numberField: 'planNumber', titleField: 'description' },
  { key: 'fmeas', label: 'FMEA Workspace', shortLabel: 'FMEA', endpoint: '/quality/fmeas', icon: GitBranch, numberField: 'fmeaNumber', titleField: 'failureMode' },
  { key: 'ppap-apqp', label: 'PPAP / APQP', shortLabel: 'PPAP', endpoint: '/quality/ppap-apqp', icon: FileCheck2, numberField: 'recordNumber', titleField: 'recordType' },
  { key: 'gauges', label: 'Gauge Management', shortLabel: 'Gauges', endpoint: '/quality/gauges', icon: Gauge, numberField: 'gaugeNumber', titleField: 'description' },
  { key: 'msa-studies', label: 'MSA', shortLabel: 'MSA', endpoint: '/quality/msa-studies', icon: SlidersHorizontal, numberField: 'studyNumber', titleField: 'studyType' },
  { key: 'customer-complaints', label: 'Customer Complaints', shortLabel: 'Complaints', endpoint: '/quality/customer-complaints', icon: Users, numberField: 'complaintNumber', titleField: 'description' },
];

function toRows(payload: any): QmsRecord[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function statusTone(status?: string) {
  const normalized = String(status ?? 'DRAFT').toUpperCase();
  if (['RELEASED', 'APPROVED', 'ACCEPTED', 'CLOSED', 'COMPLETED', 'ACTIVE'].includes(normalized)) return 'bg-emerald-400/10 text-emerald-200 border-emerald-400/30';
  if (['REJECTED', 'FAILED', 'EXPIRED', 'CRITICAL'].includes(normalized)) return 'bg-rose-400/10 text-rose-200 border-rose-400/30';
  if (['OPEN', 'IN_PROGRESS', 'INVESTIGATION', 'ACTION', 'REVIEW', 'CALIBRATION_DUE', 'QUARANTINED'].includes(normalized)) return 'bg-amber-400/10 text-amber-100 border-amber-400/30';
  return 'bg-slate-400/10 text-slate-200 border-slate-400/20';
}

function recordLabel(row: QmsRecord, module: ModuleConfig) {
  return row[module.numberField] ?? row.id ?? 'Unnumbered';
}

function hasTrace(row: QmsRecord) {
  const keys = ['projectId', 'drawingId', 'bomId', 'routingId', 'workOrderId', 'jobCardId', 'machineId', 'operatorId', 'inspectionPlanId', 'materialLot', 'supplierId'];
  return keys.filter((key) => row[key]).length;
}

export function QualityPage() {
  const [activeKey, setActiveKey] = useState(modules[0].key);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');

  const moduleQueries = useQueries({
    queries: modules.map((module) => ({
      queryKey: ['qms', module.key],
      queryFn: () => api.get(module.endpoint, { params: { limit: 50 } }).then((r) => r.data),
      retry: 1,
      staleTime: 2 * 60 * 1000,
    })),
  });
  const datasets = Object.fromEntries(modules.map((module, index) => {
    const query = moduleQueries[index];
    const data = toRows(query.data);
    return [module.key, { data, total: (query.data as any)?.total ?? data.length, isLoading: query.isLoading, isError: query.isError }];
  })) as Record<string, QmsDataset>;
  const activeModule = modules.find((module) => module.key === activeKey) ?? modules[0];
  const activeDataset = datasets[activeModule.key];

  const allRows = useMemo<QmsRecord[]>(() => modules.flatMap((module) => datasets[module.key].data.map((row) => ({ ...row, moduleKey: module.key, moduleLabel: module.shortLabel } as QmsRecord))), [datasets]);
  const openItems = allRows.filter((row) => ['OPEN', 'IN_PROGRESS', 'INVESTIGATION', 'ACTION', 'REVIEW', 'CALIBRATION_DUE', 'QUARANTINED'].includes(String(row.status ?? '').toUpperCase()));
  const rejectedItems = allRows.filter((row) => ['REJECTED', 'FAILED', 'EXPIRED', 'CRITICAL'].includes(String(row.status ?? '').toUpperCase()));
  const traceLinked = allRows.filter((row) => hasTrace(row) > 0).length;
  const traceCoverage = allRows.length ? Math.round((traceLinked / allRows.length) * 100) : 0;

  const statusCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of allRows) {
      const key = String(row.status ?? 'DRAFT').toUpperCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Object.fromEntries(map.entries());
  }, [allRows]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return activeDataset.data.filter((row) => {
      const matchesSearch = !needle || JSON.stringify(row).toLowerCase().includes(needle);
      const matchesStatus = status === 'ALL' || String(row.status ?? '').toUpperCase() === status;
      return matchesSearch && matchesStatus;
    });
  }, [activeDataset.data, search, status]);

  const spcData = useMemo(() => {
    const base = activeDataset.data.slice(0, 12).map((row, index) => ({
      name: recordLabel(row, activeModule).slice(0, 8),
      cp: Number(row.cp ?? row.repeatability ?? row.acceptedQty ?? index + 1),
      cpk: Number(row.cpk ?? row.reproducibility ?? row.rejectedQty ?? Math.max(1, index)),
    }));
    return base.length ? base.reverse() : [
      { name: 'S1', cp: 1.12, cpk: 0.94 },
      { name: 'S2', cp: 1.28, cpk: 1.04 },
      { name: 'S3', cp: 1.33, cpk: 1.18 },
      { name: 'S4', cp: 1.21, cpk: 1.01 },
    ];
  }, [activeDataset.data, activeModule]);

  const columns = [
    { key: 'number', header: 'Record', render: (row: QmsRecord) => <span className="font-semibold text-white">{recordLabel(row, activeModule)}</span> },
    { key: 'title', header: 'Scope', render: (row: QmsRecord) => <span>{row[activeModule.titleField ?? 'title'] ?? row.description ?? row.status ?? '-'}</span> },
    { key: 'status', header: 'Status', render: (row: QmsRecord) => <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusTone(row.status)}`}>{row.status ?? 'DRAFT'}</span> },
    { key: 'trace', header: 'Trace Links', render: (row: QmsRecord) => <span className="text-slate-300">{hasTrace(row)} / 11</span> },
    { key: 'updatedAt', header: 'Updated', render: (row: QmsRecord) => row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '-' },
  ];

  const anyError = modules.some((module) => datasets[module.key].isError);
  const anyLoading = modules.some((module) => datasets[module.key].isLoading);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Quality Management System</h1>
          <p className="mt-1 text-sm text-slate-400">Engineering release to inspection, NCR, CAPA, PPAP, gauge control, and customer release.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary"><Filter className="mr-2 h-4 w-4" /> Bulk Review</button>
          <button className="btn-primary"><PackageCheck className="mr-2 h-4 w-4" /> Release Approval</button>
        </div>
      </div>

      {anyError && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100" role="alert">
          <AlertTriangle className="h-4 w-4" /> Some QMS modules could not be loaded.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="QMS Records" value={allRows.length} icon={ClipboardCheck} variant="info" status="Live" trend={Math.max(0, Math.min(25, Math.round((allRows.length || 0) / 3)))} trendDirection="up" trendLabel="active" insight="Active quality records are synchronized from the backend workflow modules." updatedAt="now" />
        <KpiCard title="Open Quality Work" value={openItems.length} icon={Wrench} variant="warning" status="Watch" trend={Math.max(0, openItems.length)} trendDirection="up" trendLabel="open" insight="Open QMS work remains visible from engineering release and in-process inspection." updatedAt="now" />
        <KpiCard title="Escalations" value={rejectedItems.length} icon={ShieldAlert} variant="danger" status="Escalated" trend={Math.max(0, rejectedItems.length)} trendDirection="down" trendLabel="risk" insight="Rejected or critical items are surfaced for immediate containment follow-up." updatedAt="now" />
        <KpiCard title="Trace Coverage" value={traceCoverage} displayValue={`${traceCoverage}%`} icon={BadgeCheck} variant="success" status="Linked" trend={Math.max(0, Math.min(20, traceCoverage))} trendDirection="up" trendLabel="coverage" insight="Traceability anchors continue to bridge engineering, MES, and quality operations." updatedAt="now" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card className="rounded-lg">
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle>QMS Modules</CardTitle>
                <div className="flex min-w-0 flex-1 gap-2 lg:max-w-xl">
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2">
                    <Search className="h-4 w-4 text-slate-500" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" placeholder="Search records" aria-label="Search quality records" />
                  </div>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none" aria-label="Filter records by status">
                    <option value="ALL">All</option>
                    <option value="DRAFT">Draft</option>
                    <option value="OPEN">Open</option>
                    <option value="REVIEW">Review</option>
                    <option value="RELEASED">Released</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {modules.map((module) => {
                  const Icon = module.icon;
                  const selected = module.key === activeKey;
                  return (
                    <button
                      key={module.key}
                      onClick={() => setActiveKey(module.key)}
                      className={`flex min-h-16 items-center justify-between rounded-lg border px-3 py-2 text-left transition ${selected ? 'border-cyan-300/60 bg-cyan-400/10 text-cyan-100' : 'border-white/10 bg-slate-950/40 text-slate-300 hover:border-white/20'}`}
                      aria-pressed={selected}
                    >
                      <span className="flex min-w-0 items-center gap-2"><Icon className="h-4 w-4 flex-shrink-0" /><span className="truncate text-sm font-medium">{module.shortLabel}</span></span>
                      <span className="text-xs text-slate-400">{datasets[module.key].total}</span>
                    </button>
                  );
                })}
              </div>
            </CardHeader>
            <CardContent>
              <DataTable columns={columns} data={filteredRows} loading={activeDataset.isLoading} />
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Dashboard Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-slate-950/40 p-4">
                <div className="text-sm text-slate-400">Inspection workflow</div>
                <div className="mt-2 flex items-center justify-between text-sm text-slate-200">
                  <span>Incoming / In-process / Final</span>
                  <span className="font-semibold text-cyan-100">{String(statusCounts.OPEN ?? 0)} active</span>
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-950/40 p-4">
                <div className="text-sm text-slate-400">Containment focus</div>
                <div className="mt-2 flex items-center justify-between text-sm text-slate-200">
                  <span>NCR + CAPA + customer complaints</span>
                  <span className="font-semibold text-rose-100">{rejectedItems.length} escalated</span>
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-950/40 p-4">
                <div className="text-sm text-slate-400">Planning controls</div>
                <div className="mt-2 flex items-center justify-between text-sm text-slate-200">
                  <span>Inspection plans / control plans / FMEA</span>
                  <span className="font-semibold text-emerald-100">{datasets['inspection-plans'].total + datasets['control-plans'].total + datasets['fmeas'].total} managed</span>
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-950/40 p-4">
                <div className="text-sm text-slate-400">Supplier & calibration</div>
                <div className="mt-2 flex items-center justify-between text-sm text-slate-200">
                  <span>IQC / gauges / MSA</span>
                  <span className="font-semibold text-amber-100">{datasets['supplier-inspections'].total + datasets['gauges'].total + datasets['msa-studies'].total} monitored</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-cyan-200" /> SPC Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={spcData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, color: '#e2e8f0' }} />
                    <Line type="monotone" dataKey="cp" stroke="#67e8f9" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="cpk" stroke="#a7f3d0" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3"><div className="text-slate-400">Cp</div><div className="text-lg font-semibold text-cyan-100">API-ready</div></div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3"><div className="text-slate-400">Cpk</div><div className="text-lg font-semibold text-emerald-100">Tracked</div></div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader><CardTitle>Traceability Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {['Project', 'Drawing', 'BOM', 'Routing', 'Work Order', 'Job Card', 'Machine', 'Operator', 'Inspection Plan', 'Material Lot', 'Supplier'].map((label, index) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm">
                  <span className="text-slate-300">{label}</span>
                  <span className={index < Math.ceil((traceCoverage / 100) * 11) ? 'text-emerald-200' : 'text-slate-500'}>{index < Math.ceil((traceCoverage / 100) * 11) ? 'Linked' : 'Pending'}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {anyLoading && <div className="sr-only" role="status">Loading quality records</div>}
    </div>
  );
}

