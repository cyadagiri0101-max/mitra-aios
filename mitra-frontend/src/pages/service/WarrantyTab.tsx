import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { listWarranties, createWarranty, checkWarrantyCoverage } from '../../utils/serviceApi';
import { unwrapList } from '../../utils/serviceApi';
import { describeWarrantyCoverage, getRemainingCycles, type WarrantyCoverageDisplay } from '../../utils/serviceStatus';
import {
  StatusBadge, fmtDate, fmtMoney, ErrorBanner, KpiTile, SectionCard, Field, inputCls, labelCls, ModalFooter,
} from './ui';
import { Plus, ShieldCheck, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface WarrantyRow {
  id: string;
  warrantyNumber: string;
  projectId: string | null;
  customerId: string | null;
  moldId: string | null;
  dispatchId: string | null;
  warrantyStartDate: string | null;
  warrantyEndDate: string | null;
  coverageMonths: number | null;
  coverageTerms: string | null;
  maxCycles: number | null;
  currentCycles: number | null;
  eligibilityRule: string | null;
  status: string;
  claimLimit: number | null;
}

const COVERAGE_TONE: Record<WarrantyCoverageDisplay['state'], { label: string; cls: string }> = {
  ACTIVE: { label: 'ACTIVE', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  EXPIRED: { label: 'EXPIRED', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/40' },
  CYCLE_LIMIT_EXHAUSTED: { label: 'CYCLE LIMIT EXHAUSTED', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  INACTIVE: { label: 'INACTIVE', cls: 'bg-slate-500/15 text-slate-300 border-slate-500/40' },
};

function CoverageBadge({ warranty }: { warranty: WarrantyRow }) {
  const coverage = describeWarrantyCoverage(warranty);
  const t = COVERAGE_TONE[coverage.state];
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${t.cls}`} title={coverage.reason}>
      {t.label}
    </span>
  );
}

export function WarrantyTab() {
  const { hasRole, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<WarrantyRow | null>(null);

  const canCreate = hasRole(['ADMIN', 'MANAGEMENT', 'SERVICE']) && hasPermission('service', 'create');

  const { data, isLoading, error } = useQuery({
    queryKey: ['service-warranties'],
    queryFn: () => listWarranties({ limit: 200 }).then(r => unwrapList<WarrantyRow>(r.data)),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => createWarranty(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-warranties'] });
      toast.success('Warranty created');
      setCreateOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create warranty'),
  });

  const rows = useMemo(() => data?.items ?? [], [data]);
  const active = rows.filter(r => describeWarrantyCoverage(r).state === 'ACTIVE').length;
  const expired = rows.filter(r => describeWarrantyCoverage(r).state === 'EXPIRED' || r.status === 'EXPIRED').length;
  const cycleExhausted = rows.filter(r => describeWarrantyCoverage(r).state === 'CYCLE_LIMIT_EXHAUSTED').length;
  const claimLimitTotal = rows.reduce((s, r) => s + Number(r.claimLimit ?? 0), 0);

  const columns = [
    { key: 'warrantyNumber', header: 'Warranty #', render: (r: WarrantyRow) => (
      <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500/70" /><span className="font-semibold text-slate-100">{r.warrantyNumber}</span></div>
    )},
    { key: 'projectId', header: 'Project / Tool', render: (r: WarrantyRow) => (
      <span className="text-xs">
        {r.projectId ? <span className="font-mono text-slate-400">{r.projectId.slice(0, 8)}…</span> : <span className="text-slate-500">—</span>}
        {r.moldId && <span className="ml-2 font-mono text-slate-500">mold {r.moldId.slice(0, 8)}…</span>}
      </span>
    )},
    { key: 'coverage', header: 'Coverage', render: (r: WarrantyRow) => <CoverageBadge warranty={r} /> },
    { key: 'status', header: 'Status', render: (r: WarrantyRow) => <StatusBadge status={r.status} /> },
    { key: 'start', header: 'Start', render: (r: WarrantyRow) => fmtDate(r.warrantyStartDate) },
    { key: 'end', header: 'End', render: (r: WarrantyRow) => fmtDate(r.warrantyEndDate) },
    { key: 'cycles', header: 'Cycles (used / max)', render: (r: WarrantyRow) => (
      <span className="font-mono text-xs">
        {r.currentCycles ?? 0} / {r.maxCycles ?? '—'}
      </span>
    )},
    { key: 'remaining', header: 'Remaining', render: (r: WarrantyRow) => {
      const rem = getRemainingCycles(r);
      return rem == null ? <span className="text-slate-500">—</span> : (
        <span className={`font-mono text-xs ${rem <= 0 ? 'text-rose-400' : rem < (r.maxCycles ?? 0) * 0.1 ? 'text-amber-300' : 'text-emerald-400'}`}>
          {rem.toLocaleString()}
        </span>
      );
    }},
    { key: 'claimLimit', header: 'Claim Limit', render: (r: WarrantyRow) => fmtMoney(r.claimLimit) },
    { key: 'actions', header: '', render: (r: WarrantyRow) => (
      <button onClick={(e) => { e.stopPropagation(); setDetail(r); }} className="px-2 py-1 text-xs font-medium rounded border border-slate-600/50 text-slate-300 hover:bg-slate-800">
        View
      </button>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Coverage is computed by the backend warranty rules. Use “Check Coverage” for the authoritative verdict on a given date.
        </p>
        {canCreate && (
          <button className="btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> New Warranty
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Active Coverage" value={isLoading ? '…' : active} tone="text-emerald-300" />
        <KpiTile label="Expired" value={isLoading ? '…' : expired} tone="text-rose-300" />
        <KpiTile label="Cycle Limit Exhausted" value={isLoading ? '…' : cycleExhausted} tone="text-amber-300" />
        <KpiTile label="Claim Limit (sum)" value={isLoading ? '…' : fmtMoney(claimLimitTotal)} tone="text-cyan-300" />
      </div>

      {error && <ErrorBanner message="Failed to load warranty records." />}

      <SectionCard title="Warranties" subtitle={`${data?.total ?? 0} records`}>
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-slate-900/90">
            <tr>
              {columns.map(c => <th key={c.key} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{c.header}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {isLoading && (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400 text-sm">Loading warranties…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500 text-sm">No warranty records. Warranties are auto-activated on installation completion, or create one manually.</td></tr>
            )}
            {!isLoading && rows.map(r => (
              <tr key={r.id} onClick={() => setDetail(r)} className="hover:bg-slate-900/60 cursor-pointer">
                {columns.map(c => <td key={c.key} className="px-4 py-3 text-sm text-slate-200">{c.render ? c.render(r) : (r as any)[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail ? `Warranty ${detail.warrantyNumber}` : ''} size="lg">
        {detail && <WarrantyDetail warranty={detail} onClose={() => setDetail(null)} />}
      </Modal>

      <CreateWarrantyModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={(p) => createMutation.mutate(p)}
        isSaving={createMutation.isPending}
      />
    </div>
  );
}

function WarrantyDetail({ warranty, onClose }: { warranty: WarrantyRow; onClose: () => void }) {
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10));
  const coverageQuery = useQuery({
    queryKey: ['warranty-coverage', warranty.id, incidentDate],
    queryFn: () => checkWarrantyCoverage(warranty.id, incidentDate).then(r => r.data),
    enabled: false,
    retry: 0,
    staleTime: 60_000,
  });

  const coverage = describeWarrantyCoverage(warranty);
  const t = COVERAGE_TONE[coverage.state];
  const remaining = getRemainingCycles(warranty);

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${t.cls}`}>{t.label}</span>
        <StatusBadge status={warranty.status} />
      </div>
      {coverage.reason && <p className="text-xs text-slate-400">Rule: {coverage.reason}</p>}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Project ID"><span className="font-mono text-xs">{warranty.projectId ?? '—'}</span></Field>
        <Field label="Dispatch ID"><span className="font-mono text-xs">{warranty.dispatchId ?? '—'}</span></Field>
        <Field label="Coverage Months">{warranty.coverageMonths ?? '—'}</Field>
        <Field label="Eligibility Rule">{warranty.eligibilityRule ?? '—'}</Field>
        <Field label="Start">{fmtDate(warranty.warrantyStartDate)}</Field>
        <Field label="End">{fmtDate(warranty.warrantyEndDate)}</Field>
        <Field label="Cycles Used"><span className="font-mono">{warranty.currentCycles ?? 0}</span></Field>
        <Field label="Max Cycles"><span className="font-mono">{warranty.maxCycles ?? '—'}</span></Field>
        <Field label="Remaining Cycles">
          <span className={`font-mono ${remaining != null && remaining <= 0 ? 'text-rose-400' : ''}`}>
            {remaining == null ? '—' : remaining.toLocaleString()}
          </span>
        </Field>
        <Field label="Claim Limit">{fmtMoney(warranty.claimLimit)}</Field>
      </div>

      <Field label="Coverage Terms"><span className="text-slate-300 whitespace-pre-wrap">{warranty.coverageTerms ?? '—'}</span></Field>

      <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Authoritative Coverage Check</p>
            <input type="date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)} className={inputCls + ' w-40'} />
          </div>
          <button
            onClick={() => coverageQuery.refetch()}
            disabled={coverageQuery.isFetching}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-500/40 text-blue-300 hover:bg-blue-500/10 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${coverageQuery.isFetching ? 'animate-spin' : ''}`} /> Check Coverage
          </button>
        </div>
        {coverageQuery.data && (
          <div className={`mt-3 flex items-center gap-2 text-xs rounded-lg border p-2 ${
            coverageQuery.data.isCovered
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            {coverageQuery.data.isCovered ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {coverageQuery.data.isCovered ? 'Covered for this date' : (coverageQuery.data.reason ?? 'Not covered')}
          </div>
        )}
        {coverageQuery.isError && (
          <p className="mt-3 text-xs text-rose-300">Coverage check failed: {(coverageQuery.error as any)?.response?.data?.message ?? 'Unknown error'}</p>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">Close</button>
      </div>
    </div>
  );
}

function CreateWarrantyModal({ isOpen, onClose, onSave, isSaving }: {
  isOpen: boolean; onClose: () => void; onSave: (p: Record<string, unknown>) => void; isSaving: boolean;
}) {
  const [form, setForm] = useState({
    projectId: '', customerId: '', dispatchId: '',
    warrantyStartDate: new Date().toISOString().slice(0, 10),
    coverageMonths: '12', maxCycles: '500000', currentCycles: '0', claimLimit: '',
  });

  const submit = () => {
    onSave({
      ...(form.projectId.trim() ? { projectId: form.projectId.trim() } : {}),
      ...(form.customerId.trim() ? { customerId: form.customerId.trim() } : {}),
      ...(form.dispatchId.trim() ? { dispatchId: form.dispatchId.trim() } : {}),
      warrantyStartDate: form.warrantyStartDate,
      coverageMonths: Number(form.coverageMonths) || 12,
      maxCycles: Number(form.maxCycles) || 500000,
      currentCycles: Number(form.currentCycles) || 0,
      ...(form.claimLimit.trim() ? { claimLimit: Number(form.claimLimit) } : {}),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Warranty" size="lg">
      <div className="space-y-4 text-sm text-slate-200">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Project ID (UUID)</label>
            <input value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className={inputCls + ' font-mono'} placeholder="Optional" />
          </div>
          <div>
            <label className={labelCls}>Dispatch ID (UUID)</label>
            <input value={form.dispatchId} onChange={e => setForm({ ...form, dispatchId: e.target.value })} className={inputCls + ' font-mono'} placeholder="Optional" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Start Date</label>
            <input type="date" value={form.warrantyStartDate} onChange={e => setForm({ ...form, warrantyStartDate: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Coverage Months</label>
            <input type="number" min={1} value={form.coverageMonths} onChange={e => setForm({ ...form, coverageMonths: e.target.value })} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Max Cycles</label>
            <input type="number" min={0} value={form.maxCycles} onChange={e => setForm({ ...form, maxCycles: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Current Cycles</label>
            <input type="number" min={0} value={form.currentCycles} onChange={e => setForm({ ...form, currentCycles: e.target.value })} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Claim Limit (₹)</label>
          <input type="number" min={0} value={form.claimLimit} onChange={e => setForm({ ...form, claimLimit: e.target.value })} className={inputCls} placeholder="Optional claim limit" />
        </div>
        <ModalFooter onCancel={onClose} onConfirm={submit} saving={isSaving} confirmLabel="Create Warranty" />
      </div>
    </Modal>
  );
}