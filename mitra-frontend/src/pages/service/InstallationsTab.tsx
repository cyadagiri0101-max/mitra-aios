import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { listInstallations, createInstallation, completeInstallation } from '../../utils/serviceApi';
import { unwrapList } from '../../utils/serviceApi';
import { getMissingInstallationGates, canCompleteInstallation } from '../../utils/serviceStatus';
import {
  StatusBadge, fmtDate, ErrorBanner, KpiTile, SectionCard, Field, inputCls, labelCls, ModalFooter,
} from './ui';
import { Plus, CheckCircle2, XCircle, ClipboardCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface InstallationRow {
  id: string;
  installationNumber: string;
  projectId: string | null;
  dispatchId: string | null;
  customerId: string | null;
  serviceRequestId: string | null;
  siteReadiness: string | null;
  installationDate: string | null;
  completionDate: string | null;
  checklist: Array<Record<string, unknown>> | null;
  installationReport: string | null;
  customerSignoff: boolean;
  signoffBy: string | null;
  status: string;
}

export function InstallationsTab() {
  const { hasRole, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<InstallationRow | null>(null);
  const [detail, setDetail] = useState<InstallationRow | null>(null);

  const canCreate = hasRole(['ADMIN', 'MANAGEMENT', 'SERVICE']) && hasPermission('service', 'create');
  const canComplete = hasRole(['ADMIN', 'MANAGEMENT', 'SERVICE', 'QUALITY']) && hasPermission('service', 'update');

  const { data, isLoading, error } = useQuery({
    queryKey: ['service-installations'],
    queryFn: () => listInstallations({ limit: 200 }).then(r => unwrapList<InstallationRow>(r.data)),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => createInstallation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-installations'] });
      toast.success('Installation record created');
      setCreateOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create installation'),
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => completeInstallation(id, payload),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['service-installations'] });
      queryClient.invalidateQueries({ queryKey: ['service-warranty'] });
      queryClient.invalidateQueries({ queryKey: ['service-warranties'] });
      const w = res.data?.warranty;
      toast.success(w
        ? `Installation completed — warranty ${w.warrantyNumber} activated`
        : 'Installation completed');
      setCompleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to complete installation'),
  });

  const rows = useMemo(() => data?.items ?? [], [data]);
  const completed = rows.filter(r => r.status === 'COMPLETED').length;
  const scheduled = rows.filter(r => r.status === 'SCHEDULED' || r.status === 'IN_PROGRESS').length;
  const signedOff = rows.filter(r => r.customerSignoff).length;

  const columns = [
    { key: 'installationNumber', header: 'Installation #', render: (r: InstallationRow) => (
      <div className="flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-slate-500" /><span className="font-semibold text-slate-100">{r.installationNumber}</span></div>
    )},
    { key: 'status', header: 'Status', render: (r: InstallationRow) => <StatusBadge status={r.status} /> },
    { key: 'installationDate', header: 'Scheduled Date', render: (r: InstallationRow) => fmtDate(r.installationDate) },
    { key: 'dispatchId', header: 'Dispatch', render: (r: InstallationRow) => r.dispatchId ? <span className="font-mono text-xs text-slate-400">{r.dispatchId.slice(0, 8)}…</span> : '—' },
    { key: 'projectId', header: 'Project', render: (r: InstallationRow) => r.projectId ? <span className="font-mono text-xs text-slate-400">{r.projectId.slice(0, 8)}…</span> : '—' },
    { key: 'customerSignoff', header: 'Sign-off', render: (r: InstallationRow) => r.customerSignoff
      ? <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> {r.signoffBy ?? 'Yes'}</span>
      : <span className="inline-flex items-center gap-1 text-slate-500 text-xs"><XCircle className="w-3.5 h-3.5" /> Not signed</span>},
    { key: 'actions', header: 'Actions', render: (r: InstallationRow) => (
      <div className="flex items-center gap-1.5">
        <button onClick={(e) => { e.stopPropagation(); setDetail(r); }} className="px-2 py-1 text-xs font-medium rounded border border-slate-600/50 text-slate-300 hover:bg-slate-800">
          View
        </button>
        {canComplete && r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && (
          <button onClick={(e) => { e.stopPropagation(); setCompleteTarget(r); }} className="px-2 py-1 text-xs font-medium rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10">
            Complete
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Installation & commissioning with customer sign-off. Completion auto-activates warranty when the backend permits.
        </p>
        {canCreate && (
          <button className="btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> New Installation
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiTile label="Scheduled / In Progress" value={isLoading ? '…' : scheduled} tone="text-blue-300" />
        <KpiTile label="Completed" value={isLoading ? '…' : completed} tone="text-emerald-300" />
        <KpiTile label="Customer Signed Off" value={isLoading ? '…' : signedOff} tone="text-cyan-300" />
      </div>

      {error && <ErrorBanner message="Failed to load installation records." />}

      <SectionCard title="Installations" subtitle={`${data?.total ?? 0} records`}>
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-slate-900/90">
            <tr>
              {columns.map(c => <th key={c.key} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{c.header}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {isLoading && (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400 text-sm">Loading installations…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500 text-sm">No installation records. Create one to begin commissioning.</td></tr>
            )}
            {!isLoading && rows.map(r => (
              <tr key={r.id} onClick={() => setDetail(r)} className="hover:bg-slate-900/60 cursor-pointer">
                {columns.map(c => <td key={c.key} className="px-4 py-3 text-sm text-slate-200">{c.render ? c.render(r) : (r as any)[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* Detail */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail ? `Installation ${detail.installationNumber}` : ''} size="lg">
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <StatusBadge status={detail.status} />
              {detail.customerSignoff && <span className="text-xs text-emerald-400 inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Signed off by {detail.signoffBy}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Project ID"><span className="font-mono text-xs">{detail.projectId ?? '—'}</span></Field>
              <Field label="Dispatch ID"><span className="font-mono text-xs">{detail.dispatchId ?? '—'}</span></Field>
              <Field label="Service Request"><span className="font-mono text-xs">{detail.serviceRequestId ?? '—'}</span></Field>
              <Field label="Scheduled Date">{fmtDate(detail.installationDate)}</Field>
            </div>
            <Field label="Site Readiness"><span className="text-slate-300">{detail.siteReadiness ?? '—'}</span></Field>
            <Field label="Commissioning Report">
              <span className="text-slate-300 whitespace-pre-wrap">{detail.installationReport ?? '—'}</span>
            </Field>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Setup / Test Checklist</p>
              {Array.isArray(detail.checklist) && detail.checklist.length > 0 ? (
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <table className="min-w-full divide-y divide-white/10">
                    <tbody className="divide-y divide-white/10">
                      {detail.checklist.map((c, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 text-slate-200">{String(c.item ?? c.name ?? `Item ${i + 1}`)}</td>
                          <td className="px-4 py-2">
                            <StatusBadge status={String(c.result ?? c.status ?? c.checked)} fallback="bg-slate-500/15 text-slate-400 border-slate-500/40" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-xs text-slate-500">No checklist recorded.</p>}
            </div>
          </div>
        )}
      </Modal>

      {/* Create */}
      <CreateInstallationModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={(p) => createMutation.mutate(p)}
        isSaving={createMutation.isPending}
      />

      {/* Complete */}
      <CompleteInstallationModal
        target={completeTarget}
        onClose={() => setCompleteTarget(null)}
        onConfirm={(payload) => completeMutation.mutate({ id: completeTarget!.id, payload })}
        isSaving={completeMutation.isPending}
      />
    </div>
  );
}

function CreateInstallationModal({ isOpen, onClose, onSave, isSaving }: {
  isOpen: boolean; onClose: () => void; onSave: (p: Record<string, unknown>) => void; isSaving: boolean;
}) {
  const [form, setForm] = useState({ projectId: '', dispatchId: '', siteReadiness: '', installationDate: new Date().toISOString().slice(0, 10) });
  const [checklist, setChecklist] = useState<Array<{ item: string; result: string }>>([]);

  const submit = () => {
    onSave({
      ...(form.projectId.trim() ? { projectId: form.projectId.trim() } : {}),
      ...(form.dispatchId.trim() ? { dispatchId: form.dispatchId.trim() } : {}),
      ...(form.siteReadiness.trim() ? { siteReadiness: form.siteReadiness.trim() } : {}),
      installationDate: form.installationDate,
      checklist: checklist.filter(c => c.item.trim()).map(c => ({ item: c.item.trim(), result: c.result || 'PENDING' })),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Installation" size="lg">
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
        <div>
          <label className={labelCls}>Installation Date</label>
          <input type="date" value={form.installationDate} onChange={e => setForm({ ...form, installationDate: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Site Readiness</label>
          <textarea value={form.siteReadiness} onChange={e => setForm({ ...form, siteReadiness: e.target.value })} className={inputCls + ' h-16'} placeholder="Site readiness notes" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelCls}>Setup / Test Checklist</label>
            <button type="button" onClick={() => setChecklist([...checklist, { item: '', result: 'PASS' }])} className="text-xs px-2 py-1 rounded border border-blue-500/40 text-blue-300 hover:bg-blue-500/10 inline-flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add item
            </button>
          </div>
          {checklist.length === 0 && <p className="text-xs text-slate-500 mb-1">No items yet.</p>}
          <div className="space-y-2">
            {checklist.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={c.item} onChange={e => setChecklist(checklist.map((x, j) => j === i ? { ...x, item: e.target.value } : x))} className={inputCls + ' flex-1'} placeholder="Check item (e.g. Bed alignment)" />
                <select value={c.result} onChange={e => setChecklist(checklist.map((x, j) => j === i ? { ...x, result: e.target.value } : x))} className={inputCls + ' w-32'}>
                  <option value="PASS">PASS</option>
                  <option value="FAIL">FAIL</option>
                  <option value="PENDING">PENDING</option>
                </select>
                <button type="button" onClick={() => setChecklist(checklist.filter((_, j) => j !== i))} className="text-rose-400 hover:text-rose-300 px-1" aria-label="Remove item">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <ModalFooter onCancel={onClose} onConfirm={submit} saving={isSaving} confirmLabel="Create Installation" />
      </div>
    </Modal>
  );
}

function CompleteInstallationModal({ target, onClose, onConfirm, isSaving }: {
  target: InstallationRow | null;
  onClose: () => void;
  onConfirm: (p: Record<string, unknown>) => void;
  isSaving: boolean;
}) {
  const [signoffBy, setSignoffBy] = useState('');
  const [report, setReport] = useState('');
  const [checklist, setChecklist] = useState<Array<{ item: string; result: string }>>([]);
  const [autoWarranty, setAutoWarranty] = useState(true);
  const [coverageMonths, setCoverageMonths] = useState('12');
  const [submitted, setSubmitted] = useState(false);

  const gates = {
    signoffBy,
    installationReport: report,
    checklistCount: checklist.filter(c => c.item.trim()).length,
  };
  const missing = getMissingInstallationGates(gates);
  const ready = canCompleteInstallation(gates);

  return (
    <Modal isOpen={!!target} onClose={onClose} title={target ? `Complete Installation — ${target.installationNumber}` : ''} size="lg">
      {target && (
        <div className="space-y-4 text-sm text-slate-200">
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Completion Gates</p>
            <ul className="space-y-2">
              {[
                { label: 'Customer sign-off', ok: !!signoffBy.trim() },
                { label: 'Installation / commissioning report', ok: !!report.trim() },
                { label: 'Setup / test checklist (at least one item)', ok: checklist.filter(c => c.item.trim()).length > 0 },
              ].map(g => (
                <li key={g.label} className="flex items-center gap-2 text-xs">
                  {g.ok
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    : <XCircle className="w-4 h-4 text-slate-600" />}
                  <span className={g.ok ? 'text-emerald-300' : 'text-slate-400'}>{g.label}</span>
                </li>
              ))}
            </ul>
            {!ready && submitted && (
              <p className="mt-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                Missing: {missing.join(', ')}. The backend also enforces these gates — completion will be rejected otherwise.
              </p>
            )}
          </div>

          <div>
            <label className={labelCls}>Sign-off By (customer representative) *</label>
            <input value={signoffBy} onChange={e => setSignoffBy(e.target.value)} className={inputCls} placeholder="e.g. Vikram Mehta (Chief Plant Engineer, AeroTech)" />
          </div>
          <div>
            <label className={labelCls}>Installation / Commissioning Report *</label>
            <textarea value={report} onChange={e => setReport(e.target.value)} className={inputCls + ' h-20'} placeholder="Commissioning results, first article verification…" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls}>Setup / Test Checklist *</label>
              <button type="button" onClick={() => setChecklist([...checklist, { item: '', result: 'PASS' }])} className="text-xs px-2 py-1 rounded border border-blue-500/40 text-blue-300 hover:bg-blue-500/10 inline-flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add item
              </button>
            </div>
            {checklist.length === 0 && <p className="text-xs text-slate-500 mb-1">Add at least one checklist item.</p>}
            <div className="space-y-2">
              {checklist.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={c.item} onChange={e => setChecklist(checklist.map((x, j) => j === i ? { ...x, item: e.target.value } : x))} className={inputCls + ' flex-1'} placeholder="Check item" />
                  <select value={c.result} onChange={e => setChecklist(checklist.map((x, j) => j === i ? { ...x, result: e.target.value } : x))} className={inputCls + ' w-32'}>
                    <option value="PASS">PASS</option>
                    <option value="FAIL">FAIL</option>
                    <option value="PENDING">PENDING</option>
                  </select>
                  <button type="button" onClick={() => setChecklist(checklist.filter((_, j) => j !== i))} className="text-rose-400 hover:text-rose-300 px-1" aria-label="Remove item">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={autoWarranty} onChange={e => setAutoWarranty(e.target.checked)} className="rounded" />
              Auto-activate warranty
            </label>
            <div>
              <label className={labelCls}>Coverage Months (default 12)</label>
              <input type="number" min={1} value={coverageMonths} onChange={e => setCoverageMonths(e.target.value)} disabled={!autoWarranty} className={inputCls} />
            </div>
          </div>

          <ModalFooter
            onCancel={onClose}
            onConfirm={() => {
              setSubmitted(true);
              if (!ready) return;
              onConfirm({
                signoffBy: signoffBy.trim(),
                installationReport: report.trim(),
                checklist: checklist.filter(c => c.item.trim()).map(c => ({ item: c.item.trim(), result: c.result })),
                autoActivateWarranty: autoWarranty,
                coverageMonths: Number(coverageMonths) || 12,
              });
            }}
            saving={isSaving}
            confirmLabel="Complete Installation"
          />
        </div>
      )}
    </Modal>
  );
}