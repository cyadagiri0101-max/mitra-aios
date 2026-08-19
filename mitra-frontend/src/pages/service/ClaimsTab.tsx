import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { listWarrantyClaims, createWarrantyClaim, adjudicateWarrantyClaim } from '../../utils/serviceApi';
import { unwrapList } from '../../utils/serviceApi';
import { validateClaimAdjudication } from '../../utils/serviceStatus';
import {
  StatusBadge, fmtDate, fmtMoney, ErrorBanner, KpiTile, SectionCard, Field, inputCls, labelCls, ModalFooter,
} from './ui';
import { Plus, Scale, CheckCircle2, XCircle, ShieldCheck, ShieldX } from 'lucide-react';
import toast from 'react-hot-toast';

interface ClaimRow {
  id: string;
  claimNumber: string;
  warrantyId: string | null;
  serviceRequestId: string | null;
  projectId: string | null;
  claimDate: string | null;
  issueSummary: string | null;
  eligibilityReason: string | null;
  claimAmount: number | null;
  approvedAmount: number | null;
  approvedBy: string | null;
  approvalNotes: string | null;
  resolvedDate: string | null;
  status: string;
}

export function ClaimsTab() {
  const { hasRole, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [adjudicateTarget, setAdjudicateTarget] = useState<ClaimRow | null>(null);
  const [detail, setDetail] = useState<ClaimRow | null>(null);

  const canCreate = hasRole(['ADMIN', 'MANAGEMENT', 'SERVICE']) && hasPermission('service', 'create');
  const canAdjudicate = hasRole(['ADMIN', 'MANAGEMENT', 'QUALITY', 'SERVICE']) && hasPermission('service', 'update');

  const { data, isLoading, error } = useQuery({
    queryKey: ['service-claims'],
    queryFn: () => listWarrantyClaims({ limit: 200 }).then(r => unwrapList<ClaimRow>(r.data)),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => createWarrantyClaim(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-claims'] });
      toast.success('Warranty claim submitted');
      setCreateOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to submit claim'),
  });

  const adjudicateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => adjudicateWarrantyClaim(id, payload),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['service-claims'] });
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['service-warranties'] });
      queryClient.invalidateQueries({ queryKey: ['service-warranty'] });
      queryClient.invalidateQueries({ queryKey: ['project-service-lineage'] });
      const decision = res.data?.claim?.status;
      toast.success(decision === 'APPROVED' ? 'Claim approved — service request synchronized' : 'Claim rejected');
      setAdjudicateTarget(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Adjudication failed'),
  });

  const rows = useMemo(() => data?.items ?? [], [data]);
  const submitted = rows.filter(r => r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW').length;
  const approved = rows.filter(r => r.status === 'APPROVED').length;
  const rejected = rows.filter(r => r.status === 'REJECTED').length;
  const approvedValue = rows.reduce((s, r) => s + Number(r.approvedAmount ?? 0), 0);

  const columns = [
    { key: 'claimNumber', header: 'Claim #', render: (r: ClaimRow) => (
      <div className="flex items-center gap-2"><Scale className="w-4 h-4 text-slate-500" /><span className="font-semibold text-slate-100">{r.claimNumber}</span></div>
    )},
    { key: 'status', header: 'Status', render: (r: ClaimRow) => <StatusBadge status={r.status} /> },
    { key: 'warrantyId', header: 'Warranty', render: (r: ClaimRow) => r.warrantyId ? <span className="font-mono text-xs text-slate-400">{r.warrantyId.slice(0, 8)}…</span> : '—' },
    { key: 'serviceRequestId', header: 'Service Request', render: (r: ClaimRow) => r.serviceRequestId ? <span className="font-mono text-xs text-slate-400">{r.serviceRequestId.slice(0, 8)}…</span> : '—' },
    { key: 'claimDate', header: 'Claim Date', render: (r: ClaimRow) => fmtDate(r.claimDate) },
    { key: 'issueSummary', header: 'Issue', render: (r: ClaimRow) => <span className="text-xs text-slate-300 truncate max-w-[240px] block" title={r.issueSummary ?? ''}>{r.issueSummary ?? '—'}</span> },
    { key: 'claimAmount', header: 'Claim Amount', render: (r: ClaimRow) => <span className="font-mono text-xs">{fmtMoney(r.claimAmount)}</span> },
    { key: 'approvedAmount', header: 'Approved', render: (r: ClaimRow) => r.approvedAmount != null ? <span className="font-mono text-xs text-emerald-400">{fmtMoney(r.approvedAmount)}</span> : <span className="text-slate-600">—</span> },
    { key: 'actions', header: 'Actions', render: (r: ClaimRow) => (
      <div className="flex items-center gap-1.5">
        <button onClick={(e) => { e.stopPropagation(); setDetail(r); }} className="px-2 py-1 text-xs font-medium rounded border border-slate-600/50 text-slate-300 hover:bg-slate-800">View</button>
        {canAdjudicate && (r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW') && (
          <button onClick={(e) => { e.stopPropagation(); setAdjudicateTarget(r); }} className="px-2 py-1 text-xs font-medium rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 inline-flex items-center gap-1">
            <Scale className="w-3 h-3" /> Adjudicate
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Warranty claims adjudication — APPROVE validates coverage and financials; REJECT requires a reason. The service request is synchronized by the backend.
        </p>
        {canCreate && (
          <button className="btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> New Claim
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Pending Adjudication" value={isLoading ? '…' : submitted} tone="text-blue-300" />
        <KpiTile label="Approved" value={isLoading ? '…' : approved} tone="text-emerald-300" />
        <KpiTile label="Rejected" value={isLoading ? '…' : rejected} tone="text-rose-300" />
        <KpiTile label="Approved Value" value={isLoading ? '…' : fmtMoney(approvedValue)} tone="text-cyan-300" />
      </div>

      {error && <ErrorBanner message="Failed to load warranty claims." />}

      <SectionCard title="Warranty Claims" subtitle={`${data?.total ?? 0} records`}>
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-slate-900/90">
            <tr>
              {columns.map(c => <th key={c.key} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{c.header}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {isLoading && (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400 text-sm">Loading warranty claims…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500 text-sm">No warranty claims submitted.</td></tr>
            )}
            {!isLoading && rows.map(r => (
              <tr key={r.id} onClick={() => setDetail(r)} className="hover:bg-slate-900/60 cursor-pointer">
                {columns.map(c => <td key={c.key} className="px-4 py-3 text-sm text-slate-200">{c.render ? c.render(r) : (r as any)[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail ? `Claim ${detail.claimNumber}` : ''} size="lg">
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <StatusBadge status={detail.status} />
              {detail.status === 'APPROVED' && <span className="text-xs text-emerald-400 inline-flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Approved by {detail.approvedBy ?? '—'} on {fmtDate(detail.resolvedDate)}</span>}
              {detail.status === 'REJECTED' && <span className="text-xs text-rose-400 inline-flex items-center gap-1"><XCircle className="w-4 h-4" /> Rejected on {fmtDate(detail.resolvedDate)}</span>}
            </div>
            <Field label="Issue Summary"><span className="text-slate-200 whitespace-pre-wrap">{detail.issueSummary ?? '—'}</span></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Warranty ID"><span className="font-mono text-xs">{detail.warrantyId ?? '—'}</span></Field>
              <Field label="Service Request ID"><span className="font-mono text-xs">{detail.serviceRequestId ?? '—'}</span></Field>
              <Field label="Project ID"><span className="font-mono text-xs">{detail.projectId ?? '—'}</span></Field>
              <Field label="Claim Date">{fmtDate(detail.claimDate)}</Field>
              <Field label="Claim Amount"><span className="font-mono">{fmtMoney(detail.claimAmount)}</span></Field>
              <Field label="Approved Amount"><span className="font-mono text-emerald-400">{fmtMoney(detail.approvedAmount)}</span></Field>
            </div>
            {detail.eligibilityReason && <Field label="Eligibility / Rejection Reason"><span className="text-slate-300 whitespace-pre-wrap">{detail.eligibilityReason}</span></Field>}
            {detail.approvalNotes && <Field label="Approval Notes"><span className="text-slate-300 whitespace-pre-wrap">{detail.approvalNotes}</span></Field>}
            <div className="flex justify-end pt-2">
              <button onClick={() => setDetail(null)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">Close</button>
            </div>
          </div>
        )}
      </Modal>

      <CreateClaimModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={(p) => createMutation.mutate(p)}
        isSaving={createMutation.isPending}
      />

      <AdjudicateModal
        target={adjudicateTarget}
        onClose={() => setAdjudicateTarget(null)}
        onConfirm={(payload) => adjudicateMutation.mutate({ id: adjudicateTarget!.id, payload })}
        isSaving={adjudicateMutation.isPending}
      />
    </div>
  );
}

function CreateClaimModal({ isOpen, onClose, onSave, isSaving }: {
  isOpen: boolean; onClose: () => void; onSave: (p: Record<string, unknown>) => void; isSaving: boolean;
}) {
  const [form, setForm] = useState({
    warrantyId: '', serviceRequestId: '', projectId: '',
    claimDate: new Date().toISOString().slice(0, 10),
    issueSummary: '', claimAmount: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const valid = form.issueSummary.trim().length > 0 && Number(form.claimAmount) > 0;

  const submit = () => {
    setSubmitted(true);
    if (!valid) return;
    onSave({
      ...(form.warrantyId.trim() ? { warrantyId: form.warrantyId.trim() } : {}),
      ...(form.serviceRequestId.trim() ? { serviceRequestId: form.serviceRequestId.trim() } : {}),
      ...(form.projectId.trim() ? { projectId: form.projectId.trim() } : {}),
      claimDate: form.claimDate,
      issueSummary: form.issueSummary.trim(),
      claimAmount: Number(form.claimAmount),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submit Warranty Claim" size="lg">
      <div className="space-y-4 text-sm text-slate-200">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Warranty ID (UUID)</label>
            <input value={form.warrantyId} onChange={e => setForm({ ...form, warrantyId: e.target.value })} className={inputCls + ' font-mono'} placeholder="Required for approval" />
          </div>
          <div>
            <label className={labelCls}>Service Request ID (UUID)</label>
            <input value={form.serviceRequestId} onChange={e => setForm({ ...form, serviceRequestId: e.target.value })} className={inputCls + ' font-mono'} placeholder="Optional" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Project ID (UUID)</label>
            <input value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className={inputCls + ' font-mono'} placeholder="Optional" />
          </div>
          <div>
            <label className={labelCls}>Claim Date</label>
            <input type="date" value={form.claimDate} onChange={e => setForm({ ...form, claimDate: e.target.value })} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Issue Summary *</label>
          <textarea value={form.issueSummary} onChange={e => setForm({ ...form, issueSummary: e.target.value })} className={`${inputCls} h-16 ${submitted && !form.issueSummary.trim() ? 'border-rose-500/60' : ''}`} placeholder="Describe the issue" />
        </div>
        <div>
          <label className={labelCls}>Claim Amount (₹) * — must be greater than 0 for approval</label>
          <input type="number" min={0} value={form.claimAmount} onChange={e => setForm({ ...form, claimAmount: e.target.value })} className={`${inputCls} ${submitted && !(Number(form.claimAmount) > 0) ? 'border-rose-500/60' : ''}`} placeholder="0" />
        </div>
        {submitted && !valid && <p className="text-xs text-rose-400">Issue summary and a claim amount greater than 0 are required.</p>}
        <ModalFooter onCancel={onClose} onConfirm={submit} saving={isSaving} confirmLabel="Submit Claim" />
      </div>
    </Modal>
  );
}

function AdjudicateModal({ target, onClose, onConfirm, isSaving }: {
  target: ClaimRow | null;
  onClose: () => void;
  onConfirm: (p: Record<string, unknown>) => void;
  isSaving: boolean;
}) {
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const validation = validateClaimAdjudication({
    decision,
    rejectionReason,
    approvedAmount: approvedAmount === '' ? null : Number(approvedAmount),
    claimAmount: target?.claimAmount,
  });

  return (
    <Modal isOpen={!!target} onClose={onClose} title={target ? `Adjudicate Claim — ${target.claimNumber}` : ''} size="lg">
      {target && (
        <div className="space-y-4 text-sm text-slate-200">
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Claim Amount</p>
              <p className="mt-1 text-lg font-semibold text-white">{fmtMoney(target.claimAmount)}</p>
            </div>
            <StatusBadge status={target.status} />
          </div>

          <div>
            <label className={labelCls}>Decision *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDecision('APPROVE')}
                className={`px-3 py-2 rounded-lg border text-xs font-medium inline-flex items-center justify-center gap-1.5 ${
                  decision === 'APPROVE' ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300' : 'border-white/10 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" /> Approve
              </button>
              <button
                type="button"
                onClick={() => setDecision('REJECT')}
                className={`px-3 py-2 rounded-lg border text-xs font-medium inline-flex items-center justify-center gap-1.5 ${
                  decision === 'REJECT' ? 'bg-rose-500/15 border-rose-500/50 text-rose-300' : 'border-white/10 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>

          {decision === 'APPROVE' && (
            <>
              <p className="text-xs text-slate-400 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Backend validates warranty coverage, cycle limits and claim financials before approving.
              </p>
              <div>
                <label className={labelCls}>Approved Amount (₹) — leave blank to approve full claim amount</label>
                <input type="number" min={0} value={approvedAmount} onChange={e => setApprovedAmount(e.target.value)} className={inputCls} placeholder={`${target.claimAmount ?? 0}`} />
              </div>
              <div>
                <label className={labelCls}>Approval Notes</label>
                <textarea value={approvalNotes} onChange={e => setApprovalNotes(e.target.value)} className={inputCls + ' h-16'} placeholder="Justification for approval" />
              </div>
            </>
          )}

          {decision === 'REJECT' && (
            <>
              <p className="text-xs text-amber-300 inline-flex items-center gap-1.5">
                <ShieldX className="w-4 h-4" />
                Rejection reason is mandatory — the backend rejects claims without one.
              </p>
              <div>
                <label className={labelCls}>Rejection Reason *</label>
                <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className={`${inputCls} h-16 ${submitted && !rejectionReason.trim() ? 'border-rose-500/60' : ''}`} placeholder="Why is this claim rejected?" />
              </div>
            </>
          )}

          <div>
            <label className={labelCls}>Resolution Notes</label>
            <textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} className={inputCls + ' h-16'} placeholder="Resolution summary (synced to the linked service request)" />
          </div>

          {submitted && !validation.valid && (
            <p className="text-xs text-rose-400">{validation.errors.join(' · ')}</p>
          )}

          <ModalFooter
            onCancel={onClose}
            onConfirm={() => {
              setSubmitted(true);
              if (!validation.valid) return;
              const payload: Record<string, unknown> = { decision };
              if (decision === 'APPROVE') {
                if (approvalNotes.trim()) payload.approvalNotes = approvalNotes.trim();
                if (approvedAmount !== '' && Number(approvedAmount) >= 0) payload.approvedAmount = Number(approvedAmount);
              } else {
                payload.rejectionReason = rejectionReason.trim();
              }
              if (resolutionNotes.trim()) payload.resolutionNotes = resolutionNotes.trim();
              onConfirm(payload);
            }}
            saving={isSaving}
            confirmLabel={decision === 'APPROVE' ? 'Approve Claim' : 'Reject Claim'}
            danger={decision === 'REJECT'}
          />
        </div>
      )}
    </Modal>
  );
}