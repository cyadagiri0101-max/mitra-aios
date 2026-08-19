import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { listServiceRequests, createServiceRequest, updateServiceRequest, closeServiceRequest } from '../../utils/serviceApi';
import { unwrapList } from '../../utils/serviceApi';
import { SERVICE_REQUEST_STATUSES, SERVICE_REQUEST_PRIORITIES, SERVICE_TYPES } from '../../utils/serviceStatus';
import {
  StatusBadge, fmtDate, fmtMoney, ErrorBanner, KpiTile, SectionCard, Field, inputCls, labelCls, ModalFooter,
} from './ui';
import { Plus, Wrench, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface RequestRow {
  id: string;
  srNumber: string;
  customerName: string | null;
  customerId: string | null;
  projectId: string | null;
  moldId: string | null;
  serviceType: string;
  issueDescription: string;
  reportedBy: string | null;
  reportedDate: string;
  priority: string;
  assignedTechnicianId: string | null;
  estimatedCompletionDate: string | null;
  actualCompletionDate: string | null;
  status: string;
  resolutionSummary: string | null;
  warrantyClaim: boolean;
  costEstimate: number | null;
  actualCost: number | null;
}

const PRIORITY_TONE: Record<string, string> = {
  LOW: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
  MEDIUM: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40',
  HIGH: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
  CRITICAL: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
};

export function RequestsTab() {
  const { hasRole, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<RequestRow | null>(null);

  const canCreate = hasRole(['ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'SERVICE']) && hasPermission('service', 'create');
  const canUpdate = hasRole(['ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'SERVICE']) && hasPermission('service', 'update');

  const { data, isLoading, error } = useQuery({
    queryKey: ['service-requests'],
    queryFn: () => listServiceRequests({ limit: 200 }).then(r => unwrapList<RequestRow>(r.data)),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => createServiceRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      toast.success('Service request created');
      setCreateOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create request'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateServiceRequest(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      toast.success('Service request status updated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update status'),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => closeServiceRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      toast.success('Service request closed');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to close request'),
  });

  const rows = useMemo(() => data?.items ?? [], [data]);
  const open = rows.filter(r => ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(r.status)).length;
  const resolved = rows.filter(r => ['RESOLVED', 'CLOSED'].includes(r.status)).length;
  const critical = rows.filter(r => r.priority === 'CRITICAL' && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(r.status)).length;
  const estValue = rows.reduce((s, r) => s + Number(r.costEstimate ?? 0), 0);

  const columns = [
    { key: 'srNumber', header: 'Request #', render: (r: RequestRow) => (
      <div className="flex items-center gap-2"><Wrench className="w-4 h-4 text-slate-500" /><span className="font-semibold text-slate-100">{r.srNumber}</span></div>
    )},
    { key: 'customerName', header: 'Customer', render: (r: RequestRow) => r.customerName ?? '—' },
    { key: 'serviceType', header: 'Type', render: (r: RequestRow) => <span className="text-xs uppercase tracking-wider text-slate-400">{r.serviceType}</span> },
    { key: 'priority', header: 'Priority', render: (r: RequestRow) => (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${PRIORITY_TONE[r.priority] ?? 'bg-slate-500/15 text-slate-300 border-slate-500/40'}`}>{r.priority}</span>
    )},
    { key: 'status', header: 'Status', render: (r: RequestRow) => <StatusBadge status={r.status} /> },
    { key: 'reportedDate', header: 'Created', render: (r: RequestRow) => fmtDate(r.reportedDate) },
    { key: 'warrantyClaim', header: 'Warranty', render: (r: RequestRow) => r.warrantyClaim ? <span className="text-emerald-400 text-xs font-semibold">Yes</span> : <span className="text-slate-600">—</span> },
    { key: 'actions', header: 'Actions', render: (r: RequestRow) => (
      <div className="flex items-center gap-1.5">
        <button onClick={(e) => { e.stopPropagation(); setDetail(r); }} className="px-2 py-1 text-xs font-medium rounded border border-slate-600/50 text-slate-300 hover:bg-slate-800">View</button>
        {canUpdate && r.status !== 'CLOSED' && r.status !== 'CANCELLED' && (
          <>
            <select
              value={r.status}
              onChange={(e) => { e.stopPropagation(); statusMutation.mutate({ id: r.id, status: e.target.value }); }}
              className="bg-slate-950 border border-white/10 rounded-lg px-1.5 py-1 text-xs text-white focus:outline-none"
              aria-label="Update status"
            >
              {SERVICE_REQUEST_STATUSES.filter(s => !['CLOSED', 'CANCELLED'].includes(s)).map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            {r.status !== 'RESOLVED' && (
              <button
                onClick={(e) => { e.stopPropagation();
                  if (window.confirm(`Close request ${r.srNumber}?`)) closeMutation.mutate(r.id);
                }}
                className="px-2 py-1 text-xs font-medium rounded border border-slate-600/50 text-slate-400 hover:bg-slate-800 inline-flex items-center gap-1"
              >
                <XCircle className="w-3 h-3" /> Close
              </button>
            )}
          </>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Field service requests with warranty linkage. Status transitions are governed by the backend.
        </p>
        {canCreate && (
          <button className="btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> New Request
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Open Requests" value={isLoading ? '…' : open} tone="text-blue-300" />
        <KpiTile label="Resolved / Closed" value={isLoading ? '…' : resolved} tone="text-emerald-300" />
        <KpiTile label="Open Critical" value={isLoading ? '…' : critical} tone="text-rose-300" />
        <KpiTile label="Est. Cost (open)" value={isLoading ? '…' : fmtMoney(estValue)} tone="text-cyan-300" />
      </div>

      {error && <ErrorBanner message="Failed to load service requests." />}

      <SectionCard title="Service Requests" subtitle={`${data?.total ?? 0} records`}>
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-slate-900/90">
            <tr>
              {columns.map(c => <th key={c.key} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{c.header}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {isLoading && (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400 text-sm">Loading service requests…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500 text-sm">No service requests yet.</td></tr>
            )}
            {!isLoading && rows.map(r => (
              <tr key={r.id} onClick={() => setDetail(r)} className="hover:bg-slate-900/60 cursor-pointer">
                {columns.map(c => <td key={c.key} className="px-4 py-3 text-sm text-slate-200">{c.render ? c.render(r) : (r as any)[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail ? `Request ${detail.srNumber}` : ''} size="lg">
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <StatusBadge status={detail.status} />
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${PRIORITY_TONE[detail.priority] ?? ''}`}>{detail.priority}</span>
            </div>
            <Field label="Issue Description"><span className="text-slate-200">{detail.issueDescription}</span></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Customer">{detail.customerName ?? '—'}</Field>
              <Field label="Service Type">{detail.serviceType}</Field>
              <Field label="Project ID"><span className="font-mono text-xs">{detail.projectId ?? '—'}</span></Field>
              <Field label="Mold ID"><span className="font-mono text-xs">{detail.moldId ?? '—'}</span></Field>
              <Field label="Reported By">{detail.reportedBy ?? '—'}</Field>
              <Field label="Reported Date">{fmtDate(detail.reportedDate)}</Field>
              <Field label="Assigned Technician"><span className="font-mono text-xs">{detail.assignedTechnicianId ?? '—'}</span></Field>
              <Field label="Warranty Claim">{detail.warrantyClaim ? 'Yes' : 'No'}</Field>
              <Field label="Cost Estimate">{fmtMoney(detail.costEstimate)}</Field>
              <Field label="Actual Cost">{fmtMoney(detail.actualCost)}</Field>
            </div>
            {detail.resolutionSummary && (
              <Field label="Resolution"><span className="text-slate-200 whitespace-pre-wrap">{detail.resolutionSummary}</span></Field>
            )}
            <div className="flex justify-end pt-2">
              <button onClick={() => setDetail(null)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">Close</button>
            </div>
          </div>
        )}
      </Modal>

      <CreateRequestModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={(p) => createMutation.mutate(p)}
        isSaving={createMutation.isPending}
      />
    </div>
  );
}

function CreateRequestModal({ isOpen, onClose, onSave, isSaving }: {
  isOpen: boolean; onClose: () => void; onSave: (p: Record<string, unknown>) => void; isSaving: boolean;
}) {
  const [form, setForm] = useState({
    customerName: '', issueDescription: '', reportedDate: new Date().toISOString().slice(0, 10),
    serviceType: 'REPAIR', priority: 'MEDIUM', projectId: '', moldId: '', reportedBy: '',
    warrantyClaim: false, costEstimate: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const valid = form.customerName.trim().length > 0 && form.issueDescription.trim().length >= 5 && form.reportedDate.length > 0;

  const submit = () => {
    setSubmitted(true);
    if (!valid) return;
    onSave({
      customerName: form.customerName.trim(),
      issueDescription: form.issueDescription.trim(),
      reportedDate: form.reportedDate,
      serviceType: form.serviceType,
      priority: form.priority,
      ...(form.projectId.trim() ? { projectId: form.projectId.trim() } : {}),
      ...(form.moldId.trim() ? { moldId: form.moldId.trim() } : {}),
      ...(form.reportedBy.trim() ? { reportedBy: form.reportedBy.trim() } : {}),
      warrantyClaim: form.warrantyClaim,
      ...(form.costEstimate.trim() ? { costEstimate: Number(form.costEstimate) } : {}),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Service Request" size="lg">
      <div className="space-y-4 text-sm text-slate-200">
        <div>
          <label className={labelCls}>Customer Name *</label>
          <input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} className={`${inputCls} ${submitted && !form.customerName.trim() ? 'border-rose-500/60' : ''}`} placeholder="Customer name" />
        </div>
        <div>
          <label className={labelCls}>Issue Description * (min 5 chars)</label>
          <textarea value={form.issueDescription} onChange={e => setForm({ ...form, issueDescription: e.target.value })} className={`${inputCls} h-20 ${submitted && form.issueDescription.trim().length < 5 ? 'border-rose-500/60' : ''}`} placeholder="Describe the issue" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Reported Date *</label>
            <input type="date" value={form.reportedDate} onChange={e => setForm({ ...form, reportedDate: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Service Type</label>
            <select value={form.serviceType} onChange={e => setForm({ ...form, serviceType: e.target.value })} className={inputCls}>
              {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Priority</label>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className={inputCls}>
              {SERVICE_REQUEST_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Reported By</label>
            <input value={form.reportedBy} onChange={e => setForm({ ...form, reportedBy: e.target.value })} className={inputCls} placeholder="Optional" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Project ID (UUID)</label>
            <input value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className={inputCls + ' font-mono'} placeholder="Optional" />
          </div>
          <div>
            <label className={labelCls}>Mold ID (UUID)</label>
            <input value={form.moldId} onChange={e => setForm({ ...form, moldId: e.target.value })} className={inputCls + ' font-mono'} placeholder="Optional" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <label className={labelCls}>Cost Estimate (₹)</label>
            <input type="number" min={0} value={form.costEstimate} onChange={e => setForm({ ...form, costEstimate: e.target.value })} className={inputCls} placeholder="Optional" />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300 pb-1">
            <input type="checkbox" checked={form.warrantyClaim} onChange={e => setForm({ ...form, warrantyClaim: e.target.checked })} className="rounded" />
            Warranty claim
          </label>
        </div>
        {submitted && !valid && <p className="text-xs text-rose-400">Customer name, issue description and reported date are required.</p>}
        <ModalFooter onCancel={onClose} onConfirm={submit} saving={isSaving} confirmLabel="Create Request" />
      </div>
    </Modal>
  );
}