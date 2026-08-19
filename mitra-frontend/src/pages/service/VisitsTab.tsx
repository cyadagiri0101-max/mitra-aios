import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { listVisits, createVisit, updateVisit } from '../../utils/serviceApi';
import { unwrapList } from '../../utils/serviceApi';
import { totalVisitHours } from '../../utils/serviceStatus';
import {
  StatusBadge, fmtDate, ErrorBanner, KpiTile, SectionCard, Field, inputCls, labelCls, ModalFooter,
} from './ui';
import { Plus, Timer, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface VisitRow {
  id: string;
  visitNumber: string;
  serviceRequestId: string | null;
  projectId: string | null;
  customerId: string | null;
  visitDate: string | null;
  technicianId: string | null;
  serviceType: string | null;
  workPerformed: string | null;
  partsUsed: Array<{ partCode: string; partName: string; qty: number }> | null;
  travelHours: number | null;
  serviceHours: number | null;
  status: string;
}

export function VisitsTab() {
  const { hasRole, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<VisitRow | null>(null);

  const canCreate = hasRole(['ADMIN', 'MANAGEMENT', 'SERVICE']) && hasPermission('service', 'create');
  const canUpdate = hasRole(['ADMIN', 'MANAGEMENT', 'SERVICE']) && hasPermission('service', 'update');

  const { data, isLoading, error } = useQuery({
    queryKey: ['service-visits'],
    queryFn: () => listVisits({ limit: 200 }).then(r => unwrapList<VisitRow>(r.data)),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => createVisit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-visits'] });
      toast.success('Service visit recorded');
      setCreateOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to record visit'),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => updateVisit(id, { status: 'COMPLETED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-visits'] });
      toast.success('Visit marked completed');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update visit'),
  });

  const rows = useMemo(() => data?.items ?? [], [data]);
  const completed = rows.filter(r => r.status === 'COMPLETED').length;
  const scheduled = rows.filter(r => r.status === 'SCHEDULED').length;
  const totalHours = rows.reduce((s, r) => s + totalVisitHours(r), 0);

  const columns = [
    { key: 'visitNumber', header: 'Visit #', render: (r: VisitRow) => (
      <div className="flex items-center gap-2"><Timer className="w-4 h-4 text-slate-500" /><span className="font-semibold text-slate-100">{r.visitNumber}</span></div>
    )},
    { key: 'status', header: 'Status', render: (r: VisitRow) => <StatusBadge status={r.status} /> },
    { key: 'technicianId', header: 'Technician', render: (r: VisitRow) => r.technicianId ? <span className="font-mono text-xs text-slate-400">{r.technicianId.slice(0, 8)}…</span> : '—' },
    { key: 'visitDate', header: 'Visit Date', render: (r: VisitRow) => fmtDate(r.visitDate) },
    { key: 'serviceType', header: 'Service Type', render: (r: VisitRow) => <span className="text-xs uppercase tracking-wider text-slate-400">{r.serviceType ?? '—'}</span> },
    { key: 'effort', header: 'Effort (Travel + Service)', render: (r: VisitRow) => {
      const total = totalVisitHours(r);
      return (
        <div className="text-xs">
          <span className={`font-mono font-semibold ${total > 0 ? 'text-cyan-300' : 'text-slate-500'}`}>{total.toFixed(1)} h</span>
          <span className="text-slate-500"> = {r.travelHours ?? 0} + {r.serviceHours ?? 0}</span>
        </div>
      );
    }},
    { key: 'actions', header: 'Actions', render: (r: VisitRow) => (
      <div className="flex items-center gap-1.5">
        <button onClick={(e) => { e.stopPropagation(); setDetail(r); }} className="px-2 py-1 text-xs font-medium rounded border border-slate-600/50 text-slate-300 hover:bg-slate-800">View</button>
        {canUpdate && r.status === 'SCHEDULED' && (
          <button
            onClick={(e) => { e.stopPropagation();
              if (window.confirm(`Mark visit ${r.visitNumber} completed?`)) completeMutation.mutate(r.id);
            }}
            className="px-2 py-1 text-xs font-medium rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 inline-flex items-center gap-1"
          >
            <CheckCircle2 className="w-3 h-3" /> Complete
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Field visits with technician effort — travel hours + service hours, and parts consumed.
        </p>
        {canCreate && (
          <button className="btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Record Visit
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiTile label="Scheduled" value={isLoading ? '…' : scheduled} tone="text-blue-300" />
        <KpiTile label="Completed" value={isLoading ? '…' : completed} tone="text-emerald-300" />
        <KpiTile label="Total Effort" value={isLoading ? '…' : `${totalHours.toFixed(1)} h`} tone="text-cyan-300" hint="Travel + service hours" />
      </div>

      {error && <ErrorBanner message="Failed to load service visits." />}

      <SectionCard title="Service Visits" subtitle={`${data?.total ?? 0} records`}>
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-slate-900/90">
            <tr>
              {columns.map(c => <th key={c.key} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{c.header}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {isLoading && (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400 text-sm">Loading service visits…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500 text-sm">No service visits recorded.</td></tr>
            )}
            {!isLoading && rows.map(r => (
              <tr key={r.id} onClick={() => setDetail(r)} className="hover:bg-slate-900/60 cursor-pointer">
                {columns.map(c => <td key={c.key} className="px-4 py-3 text-sm text-slate-200">{c.render ? c.render(r) : (r as any)[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail ? `Visit ${detail.visitNumber}` : ''} size="lg">
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <StatusBadge status={detail.status} />
              <div className="text-xs text-slate-300">
                Total effort: <span className="font-mono font-semibold text-cyan-300">{totalVisitHours(detail).toFixed(1)} h</span>
                <span className="text-slate-500"> (travel {detail.travelHours ?? 0} + service {detail.serviceHours ?? 0})</span>
              </div>
            </div>
            <Field label="Work Performed"><span className="text-slate-200 whitespace-pre-wrap">{detail.workPerformed ?? '—'}</span></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Service Request"><span className="font-mono text-xs">{detail.serviceRequestId ?? '—'}</span></Field>
              <Field label="Project ID"><span className="font-mono text-xs">{detail.projectId ?? '—'}</span></Field>
              <Field label="Technician"><span className="font-mono text-xs">{detail.technicianId ?? '—'}</span></Field>
              <Field label="Visit Date">{fmtDate(detail.visitDate)}</Field>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Parts Used</p>
              {Array.isArray(detail.partsUsed) && detail.partsUsed.length > 0 ? (
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-slate-900/90">
                      <tr>
                        <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wider text-slate-500">Part Code</th>
                        <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wider text-slate-500">Part Name</th>
                        <th className="px-4 py-2 text-right text-[10px] uppercase tracking-wider text-slate-500">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {detail.partsUsed.map((p, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 font-mono text-xs text-slate-300">{p.partCode}</td>
                          <td className="px-4 py-2 text-slate-200">{p.partName}</td>
                          <td className="px-4 py-2 text-right text-slate-200">{p.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-xs text-slate-500">No parts used.</p>}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setDetail(null)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">Close</button>
            </div>
          </div>
        )}
      </Modal>

      <CreateVisitModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={(p) => createMutation.mutate(p)}
        isSaving={createMutation.isPending}
      />
    </div>
  );
}

function CreateVisitModal({ isOpen, onClose, onSave, isSaving }: {
  isOpen: boolean; onClose: () => void; onSave: (p: Record<string, unknown>) => void; isSaving: boolean;
}) {
  const [form, setForm] = useState({
    visitDate: new Date().toISOString().slice(0, 10),
    serviceRequestId: '', projectId: '', technicianId: '',
    serviceType: 'REPAIR', workPerformed: '', travelHours: '', serviceHours: '',
  });
  const [parts, setParts] = useState<Array<{ partCode: string; partName: string; qty: string }>>([]);

  const submit = () => {
    onSave({
      visitDate: form.visitDate,
      ...(form.serviceRequestId.trim() ? { serviceRequestId: form.serviceRequestId.trim() } : {}),
      ...(form.projectId.trim() ? { projectId: form.projectId.trim() } : {}),
      ...(form.technicianId.trim() ? { technicianId: form.technicianId.trim() } : {}),
      serviceType: form.serviceType,
      ...(form.workPerformed.trim() ? { workPerformed: form.workPerformed.trim() } : {}),
      ...(form.travelHours.trim() ? { travelHours: Number(form.travelHours) } : {}),
      ...(form.serviceHours.trim() ? { serviceHours: Number(form.serviceHours) } : {}),
      partsUsed: parts.filter(p => p.partCode.trim()).map(p => ({
        partCode: p.partCode.trim(),
        partName: p.partName.trim() || p.partCode.trim(),
        qty: Number(p.qty) || 1,
      })),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Service Visit" size="lg">
      <div className="space-y-4 text-sm text-slate-200">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Visit Date</label>
            <input type="date" value={form.visitDate} onChange={e => setForm({ ...form, visitDate: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Service Type</label>
            <select value={form.serviceType} onChange={e => setForm({ ...form, serviceType: e.target.value })} className={inputCls}>
              <option value="REPAIR">REPAIR</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
              <option value="MODIFICATION">MODIFICATION</option>
              <option value="INSPECTION">INSPECTION</option>
              <option value="EMERGENCY">EMERGENCY</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Service Request ID (UUID)</label>
            <input value={form.serviceRequestId} onChange={e => setForm({ ...form, serviceRequestId: e.target.value })} className={inputCls + ' font-mono'} placeholder="Optional" />
          </div>
          <div>
            <label className={labelCls}>Technician ID (UUID)</label>
            <input value={form.technicianId} onChange={e => setForm({ ...form, technicianId: e.target.value })} className={inputCls + ' font-mono'} placeholder="Optional" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Project ID (UUID)</label>
          <input value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className={inputCls + ' font-mono'} placeholder="Optional" />
        </div>
        <div>
          <label className={labelCls}>Work Performed</label>
          <textarea value={form.workPerformed} onChange={e => setForm({ ...form, workPerformed: e.target.value })} className={inputCls + ' h-16'} placeholder="Describe work performed" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Travel Hours</label>
            <input type="number" min={0} step="0.5" value={form.travelHours} onChange={e => setForm({ ...form, travelHours: e.target.value })} className={inputCls} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>Service Hours</label>
            <input type="number" min={0} step="0.5" value={form.serviceHours} onChange={e => setForm({ ...form, serviceHours: e.target.value })} className={inputCls} placeholder="0" />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelCls}>Parts Used</label>
            <button type="button" onClick={() => setParts([...parts, { partCode: '', partName: '', qty: '1' }])} className="text-xs px-2 py-1 rounded border border-blue-500/40 text-blue-300 hover:bg-blue-500/10 inline-flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add part
            </button>
          </div>
          {parts.length === 0 && <p className="text-xs text-slate-500 mb-1">No parts recorded.</p>}
          <div className="space-y-2">
            {parts.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={p.partCode} onChange={e => setParts(parts.map((x, j) => j === i ? { ...x, partCode: e.target.value } : x))} className={inputCls + ' flex-1 font-mono'} placeholder="Part code" />
                <input value={p.partName} onChange={e => setParts(parts.map((x, j) => j === i ? { ...x, partName: e.target.value } : x))} className={inputCls + ' flex-1'} placeholder="Part name" />
                <input type="number" min={1} value={p.qty} onChange={e => setParts(parts.map((x, j) => j === i ? { ...x, qty: e.target.value } : x))} className={inputCls + ' w-16'} placeholder="Qty" />
                <button type="button" onClick={() => setParts(parts.filter((_, j) => j !== i))} className="text-rose-400 hover:text-rose-300 px-1" aria-label="Remove part">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <ModalFooter onCancel={onClose} onConfirm={submit} saving={isSaving} confirmLabel="Record Visit" />
      </div>
    </Modal>
  );
}