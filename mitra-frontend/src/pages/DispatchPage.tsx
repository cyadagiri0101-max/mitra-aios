import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import {
  listDispatchPlans, createDispatchPlan, transitionDispatchPlan,
} from '../utils/serviceApi';
import {
  getValidDispatchTransitions, isTerminalDispatchStatus,
  dispatchTransitionRequiresCarrier, DISPATCH_TRANSITION_LABELS,
  type DispatchTransition,
} from '../utils/serviceStatus';
import {
  Plus, Search, AlertTriangle, Truck, PackageCheck, Ship, MapPin, XCircle,
  Eye, Package, Box,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, string> = {
  PLANNING: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
  PACKED: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  SHIPPED: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  DELIVERED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  CANCELLED: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
};

const STATUS_STEPS = ['PLANNING', 'PACKED', 'SHIPPED', 'DELIVERED'];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_BADGE[status] ?? 'bg-slate-500/15 text-slate-300 border-slate-500/40'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function DispatchStepper({ status }: { status: string }) {
  const stepIndex = STATUS_STEPS.indexOf(status);
  const cancelled = status === 'CANCELLED';
  return (
    <div className="flex items-center gap-1.5" aria-label={`Dispatch status: ${status}`}>
      {STATUS_STEPS.map((step, i) => {
        const done = !cancelled && stepIndex >= i;
        const current = !cancelled && stepIndex === i;
        return (
          <div key={step} className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                  done
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                    : cancelled
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      : 'bg-slate-800 border-slate-600 text-slate-400'
                }`}
              >
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] uppercase tracking-wider ${current ? 'text-emerald-300 font-semibold' : 'text-slate-400'}`}>
                {step}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`w-4 h-0.5 rounded ${done && !cancelled ? 'bg-emerald-500/50' : 'bg-slate-700'}`} />
            )}
          </div>
        );
      })}
      {cancelled && (
        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/40">
          CANCELLED
        </span>
      )}
    </div>
  );
}

interface DispatchRow {
  id: string;
  dispatchNumber: string;
  customerName: string;
  projectId: string | null;
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  plannedDate: string | null;
  shippedDate: string | null;
  deliveredDate: string | null;
  packingList: Array<{ item?: string; qty?: number; inspected?: boolean }> | null;
  notes: string | null;
  createdAt: string;
}

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

export function DispatchPage() {
  const { hasRole, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<DispatchRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<{ plan: DispatchRow; transition: DispatchTransition } | null>(null);

  const canGovern = hasRole(['ADMIN', 'MANAGEMENT', 'SALES', 'PRODUCTION', 'QUALITY']) && hasPermission('project', 'transition');
  const canCreate = hasRole(['ADMIN', 'MANAGEMENT']) && hasPermission('project', 'transition');

  const { data: plans, isLoading, error } = useQuery({
    queryKey: ['dispatch-plans'],
    queryFn: () => listDispatchPlans().then(r => (Array.isArray(r.data) ? r.data : (r.data?.data ?? []))),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => createDispatchPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-plans'] });
      toast.success('Dispatch plan created');
      setCreateOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create dispatch plan'),
  });

  const transitionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      transitionDispatchPlan(id, payload),
    onSuccess: (res: any, vars) => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-plans'] });
      const status = res.data?.status;
      toast.success(`Dispatch ${DISPATCH_TRANSITION_LABELS[vars.payload.transition as DispatchTransition]} → ${status}`);
      setTransitionTarget(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Transition failed'),
  });

  const rows: DispatchRow[] = useMemo(() => (plans ?? []) as DispatchRow[], [plans]);

  const filtered = rows.filter(p =>
    p.dispatchNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    (p.trackingNumber ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { PLANNING: 0, PACKED: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0 };
    for (const p of rows) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const openTransition = (plan: DispatchRow, transition: DispatchTransition) => {
    setTransitionTarget({ plan, transition });
  };

  const columns = [
    { key: 'dispatchNumber', header: 'Dispatch #', render: (p: DispatchRow) => (
      <div className="flex items-center gap-2">
        <Truck className="w-4 h-4 text-slate-500" />
        <span className="font-semibold text-slate-100">{p.dispatchNumber}</span>
      </div>
    )},
    { key: 'customerName', header: 'Customer' },
    { key: 'projectId', header: 'Project', render: (p: DispatchRow) => p.projectId ? <span className="font-mono text-xs text-slate-400">{p.projectId.slice(0, 8)}…</span> : '—' },
    { key: 'status', header: 'Status', render: (p: DispatchRow) => <StatusBadge status={p.status} /> },
    { key: 'carrier', header: 'Carrier', render: (p: DispatchRow) => p.carrier ?? '—' },
    { key: 'trackingNumber', header: 'Tracking #', render: (p: DispatchRow) => p.trackingNumber ? <span className="font-mono text-xs">{p.trackingNumber}</span> : '—' },
    { key: 'plannedDate', header: 'Planned', render: (p: DispatchRow) => fmtDate(p.plannedDate) },
    { key: 'shippedDate', header: 'Shipped', render: (p: DispatchRow) => fmtDate(p.shippedDate) },
    { key: 'actions', header: 'Actions', render: (p: DispatchRow) => (
      <div className="flex items-center gap-1.5">
        <button
          onClick={(e) => { e.stopPropagation(); setDetail(p); }}
          className="px-2 py-1 text-xs font-medium rounded border border-slate-600/50 text-slate-300 hover:bg-slate-800 inline-flex items-center gap-1"
          aria-label={`View dispatch ${p.dispatchNumber}`}
        >
          <Eye className="w-3 h-3" /> View
        </button>
        {canGovern && !isTerminalDispatchStatus(p.status) && getValidDispatchTransitions(p.status).map(t => (
          <button
            key={t}
            onClick={(e) => { e.stopPropagation(); openTransition(p, t); }}
            className={`px-2 py-1 text-xs font-medium rounded border inline-flex items-center gap-1 ${
              t === 'CANCEL'
                ? 'border-rose-500/40 text-rose-300 hover:bg-rose-500/10'
                : 'border-blue-500/40 text-blue-300 hover:bg-blue-500/10'
            }`}
            aria-label={`${DISPATCH_TRANSITION_LABELS[t]} ${p.dispatchNumber}`}
          >
            {t === 'PACK' ? <PackageCheck className="w-3 h-3" /> : t === 'SHIP' ? <Ship className="w-3 h-3" /> : t === 'DELIVER' ? <MapPin className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {DISPATCH_TRANSITION_LABELS[t]}
          </button>
        ))}
      </div>
    )},
  ];

  const kpis = [
    { label: 'PLANNING', value: counts.PLANNING, cls: 'text-slate-300', icon: Box },
    { label: 'PACKED', value: counts.PACKED, cls: 'text-amber-300', icon: Package },
    { label: 'SHIPPED', value: counts.SHIPPED, cls: 'text-blue-300', icon: Ship },
    { label: 'DELIVERED', value: counts.DELIVERED, cls: 'text-emerald-300', icon: MapPin },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dispatch & Logistics</h1>
          <p className="text-sm text-slate-400 mt-1">
            Governed shipment lifecycle — PLANNING → PACKED → SHIPPED → DELIVERED. Backend state machine is authoritative.
          </p>
        </div>
        {canCreate && (
          <button className="btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> New Dispatch
          </button>
        )}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-sm text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Failed to load dispatch plans.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800/80 border border-white/10">
                <Icon className={`w-5 h-5 ${k.cls}`} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{k.label}</p>
                <p className={`mt-1 text-2xl font-semibold ${k.cls}`}>{isLoading ? '…' : k.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <Card className="border border-white/10 bg-slate-900/60 backdrop-blur-md">
        <CardHeader className="border-b border-white/5 pb-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <CardTitle>Dispatch Plans</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search dispatch #, customer, tracking…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable columns={columns} data={filtered} loading={isLoading} onRowClick={(p) => setDetail(p)} />
        </CardContent>
      </Card>

      {/* Detail modal */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail ? `Dispatch ${detail.dispatchNumber}` : ''} size="lg">
        {detail && (
          <div className="space-y-5 text-sm">
            <div className="flex items-center justify-between">
              <StatusBadge status={detail.status} />
              <DispatchStepper status={detail.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Customer</p>
                <p className="mt-1 text-slate-100">{detail.customerName}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Project ID</p>
                <p className="mt-1 font-mono text-xs text-slate-300">{detail.projectId ?? '—'}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Carrier</p>
                <p className="mt-1 text-slate-100">{detail.carrier ?? '—'}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Tracking #</p>
                <p className="mt-1 font-mono text-xs text-slate-300">{detail.trackingNumber ?? '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Planned</p>
                <p className="mt-1 text-slate-100">{fmtDate(detail.plannedDate)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Shipped</p>
                <p className="mt-1 text-slate-100">{fmtDate(detail.shippedDate)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Delivered</p>
                <p className="mt-1 text-slate-100">{fmtDate(detail.deliveredDate)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Packing Checklist</p>
              {Array.isArray(detail.packingList) && detail.packingList.length > 0 ? (
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-slate-900/90">
                      <tr>
                        <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wider text-slate-500">Item</th>
                        <th className="px-4 py-2 text-right text-[10px] uppercase tracking-wider text-slate-500">Qty</th>
                        <th className="px-4 py-2 text-center text-[10px] uppercase tracking-wider text-slate-500">Inspected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {detail.packingList.map((item, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 text-slate-200">{(item as any).item ?? (item as any).partName ?? '—'}</td>
                          <td className="px-4 py-2 text-right text-slate-300">{item.qty ?? '—'}</td>
                          <td className="px-4 py-2 text-center">
                            {item.inspected === true
                              ? <span className="text-emerald-400 font-semibold">✓</span>
                              : item.inspected === false
                                ? <span className="text-rose-400 font-semibold">✗</span>
                                : <span className="text-slate-500">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500">No packing checklist recorded yet.</p>
              )}
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Notes</p>
              <p className="text-slate-300 whitespace-pre-wrap">{detail.notes ?? '—'}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <CreateDispatchModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={(data) => createMutation.mutate(data)}
        isSaving={createMutation.isPending}
      />

      {/* Transition modal */}
      <TransitionModal
        target={transitionTarget}
        onClose={() => setTransitionTarget(null)}
        onConfirm={(payload) => transitionMutation.mutate({ id: transitionTarget!.plan.id, payload })}
        isSaving={transitionMutation.isPending}
      />
    </div>
  );
}

interface CreateDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  isSaving: boolean;
}

function CreateDispatchModal({ isOpen, onClose, onSave, isSaving }: CreateDispatchModalProps) {
  const [form, setForm] = useState({
    customerName: '', projectId: '', plannedDate: new Date().toISOString().slice(0, 10),
    carrier: '', notes: '',
  });
  const [packingItems, setPackingItems] = useState<Array<{ item: string; qty: string; inspected: boolean }>>([]);
  const [submitted, setSubmitted] = useState(false);

  const reset = () => {
    setForm({ customerName: '', projectId: '', plannedDate: new Date().toISOString().slice(0, 10), carrier: '', notes: '' });
    setPackingItems([]);
    setSubmitted(false);
  };

  const valid = form.customerName.trim().length > 0;

  const submit = () => {
    setSubmitted(true);
    if (!valid) return;
    onSave({
      customerName: form.customerName,
      ...(form.projectId.trim() ? { projectId: form.projectId.trim() } : {}),
      plannedDate: form.plannedDate,
      ...(form.carrier.trim() ? { carrier: form.carrier.trim() } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      packingList: packingItems
        .filter(i => i.item.trim())
        .map(i => ({ item: i.item.trim(), qty: Number(i.qty) || 1, inspected: i.inspected })),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); reset(); }} title="Create Dispatch Plan" size="lg">
      <div className="space-y-4 text-sm text-slate-200">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Customer Name *</label>
          <input
            type="text"
            value={form.customerName}
            onChange={e => setForm({ ...form, customerName: e.target.value })}
            className={`w-full bg-slate-950 border rounded-lg p-2 text-xs ${submitted && !form.customerName.trim() ? 'border-rose-500/60' : 'border-white/10'}`}
            placeholder="Customer receiving the dispatch"
          />
          {submitted && !form.customerName.trim() && <p className="mt-1 text-xs text-rose-400">Customer name is required</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Project ID (UUID)</label>
            <input
              type="text"
              value={form.projectId}
              onChange={e => setForm({ ...form, projectId: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs font-mono"
              placeholder="Optional project UUID"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Planned Date</label>
            <input
              type="date"
              value={form.plannedDate}
              onChange={e => setForm({ ...form, plannedDate: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Carrier</label>
          <input
            type="text"
            value={form.carrier}
            onChange={e => setForm({ ...form, carrier: e.target.value })}
            className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs"
            placeholder="e.g. BlueDart Freight Logistics"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs text-slate-400">Packing Checklist</label>
            <button
              type="button"
              onClick={() => setPackingItems([...packingItems, { item: '', qty: '1', inspected: true }])}
              className="text-xs px-2 py-1 rounded border border-blue-500/40 text-blue-300 hover:bg-blue-500/10 inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add item
            </button>
          </div>
          {packingItems.length === 0 && <p className="text-xs text-slate-500 mb-1">No packing items — add items to record the packing checklist.</p>}
          <div className="space-y-2">
            {packingItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.item}
                  onChange={e => setPackingItems(packingItems.map((x, j) => j === i ? { ...x, item: e.target.value } : x))}
                  className="flex-1 bg-slate-950 border border-white/10 rounded-lg p-2 text-xs"
                  placeholder="Item name (e.g. Top Die Shoe)"
                />
                <input
                  type="number"
                  min={1}
                  value={item.qty}
                  onChange={e => setPackingItems(packingItems.map((x, j) => j === i ? { ...x, qty: e.target.value } : x))}
                  className="w-20 bg-slate-950 border border-white/10 rounded-lg p-2 text-xs"
                  placeholder="Qty"
                />
                <label className="flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={item.inspected}
                    onChange={e => setPackingItems(packingItems.map((x, j) => j === i ? { ...x, inspected: e.target.checked } : x))}
                    className="rounded"
                  />
                  Inspected
                </label>
                <button
                  type="button"
                  onClick={() => setPackingItems(packingItems.filter((_, j) => j !== i))}
                  className="text-rose-400 hover:text-rose-300 px-1"
                  aria-label="Remove item"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs h-16"
            placeholder="Optional dispatch notes"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
          <button onClick={() => { onClose(); reset(); }} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">Cancel</button>
          <button
            onClick={submit}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
          >
            {isSaving ? 'Creating…' : 'Create Dispatch Plan'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface TransitionModalProps {
  target: { plan: DispatchRow; transition: DispatchTransition } | null;
  onClose: () => void;
  onConfirm: (payload: Record<string, unknown>) => void;
  isSaving: boolean;
}

function TransitionModal({ target, onClose, onConfirm, isSaving }: TransitionModalProps) {
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!target) return null;
  const { plan, transition } = target;
  const requiresCarrier = dispatchTransitionRequiresCarrier(transition);
  const valid = !requiresCarrier || (carrier.trim().length > 0 && trackingNumber.trim().length > 0);

  const reset = () => {
    setCarrier('');
    setTrackingNumber('');
    setNotes('');
    setSubmitted(false);
  };

  const payload: Record<string, unknown> = { transition };
  if (requiresCarrier) {
    payload.carrier = carrier.trim();
    payload.trackingNumber = trackingNumber.trim();
  }
  if (notes.trim()) payload.notes = notes.trim();

  return (
    <Modal
      isOpen={!!target}
      onClose={() => { onClose(); reset(); }}
      title={`Confirm ${DISPATCH_TRANSITION_LABELS[transition]} — ${plan.dispatchNumber}`}
      size="md"
    >
      <div className="space-y-4 text-sm text-slate-200">
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-500">Current status</span>
            <StatusBadge status={plan.status} />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-500">Target status</span>
            <StatusBadge status={
              transition === 'PACK' ? 'PACKED' : transition === 'SHIP' ? 'SHIPPED' : transition === 'DELIVER' ? 'DELIVERED' : 'CANCELLED'
            } />
          </div>
        </div>

        {transition === 'CANCEL' && (
          <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2">
            Cancelling a dispatch is a governed action. Only the backend can confirm the new state.
          </p>
        )}

        {requiresCarrier && (
          <div className="space-y-3">
            <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
              Carrier and tracking number are required by the backend to SHIP a dispatch.
            </p>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Carrier *</label>
              <input
                type="text"
                value={carrier}
                onChange={e => setCarrier(e.target.value)}
                className={`w-full bg-slate-950 border rounded-lg p-2 text-xs ${submitted && !carrier.trim() ? 'border-rose-500/60' : 'border-white/10'}`}
                placeholder="e.g. BlueDart Freight Logistics"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tracking Number *</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                className={`w-full bg-slate-950 border rounded-lg p-2 text-xs font-mono ${submitted && !trackingNumber.trim() ? 'border-rose-500/60' : 'border-white/10'}`}
                placeholder="e.g. BDF-883920194-IN"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs text-slate-400 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs h-16"
            placeholder={`Optional notes for ${DISPATCH_TRANSITION_LABELS[transition].toLowerCase()}…`}
          />
        </div>

        {submitted && !valid && (
          <p className="text-xs text-rose-400">Carrier and tracking number are required to ship.</p>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
          <button onClick={() => { onClose(); reset(); }} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">Cancel</button>
          <button
            onClick={() => {
              setSubmitted(true);
              if (!valid) return;
              onConfirm(payload);
              reset();
            }}
            disabled={isSaving}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-50 ${
              transition === 'CANCEL' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {isSaving ? 'Submitting…' : `Confirm ${DISPATCH_TRANSITION_LABELS[transition]}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}