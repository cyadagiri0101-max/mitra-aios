import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { KpiCard } from '../components/KpiCard';
import { Search, AlertTriangle, Send, CheckCircle, XCircle, ExternalLink, BadgeCheck, RefreshCcw, Receipt, IndianRupee, Percent, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';

const inr = (n?: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const acceptSchema = z.object({
  projectName: z.string().min(2, 'Project name must be at least 2 characters').max(200),
});

const rejectSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500),
});

const approveSchema = z.object({
  remarks: z.string().optional(),
});

const reviseSchema = z.object({
  changeSummary: z.string().optional(),
});

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
  SENT: 'bg-blue-500/15 text-blue-300 border-blue-400/30',
  APPROVED: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  ACCEPTED: 'bg-green-500/15 text-green-300 border-green-400/30',
  REJECTED: 'bg-red-500/15 text-red-300 border-red-400/30',
  EXPIRED: 'bg-gray-500/15 text-gray-300 border-gray-400/30',
  PROJECT_CREATED: 'bg-purple-500/15 text-purple-300 border-purple-400/30',
  WON: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  LOST: 'bg-red-500/15 text-red-300 border-red-400/30',
};

export function QuotationsPage() {
  const [search, setSearch] = useState('');
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [actionModal, setActionModal] = useState<'accept' | 'reject' | 'approve' | 'revise' | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: quotations, isLoading, error } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => api.get('/commercial/quotations').then(r => { const p = r.data; return Array.isArray(p) ? p : (p?.data ?? []); }),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const { data: margin } = useQuery({
    queryKey: ['quotation-margins'],
    queryFn: () => api.get('/commercial/quotations/margins/summary').then(r => (r.data ?? {}) as any),
    retry: 2, staleTime: 60 * 1000,
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/commercial/quotations/${id}/send`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotations'] }); queryClient.invalidateQueries({ queryKey: ['quotation-margins'] }); toast.success('Quotation sent to customer'); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to send quotation'),
  });

  const { register: registerAccept, handleSubmit: handleAccept, reset: resetAccept, formState: { errors: acceptErrors } } = useForm({
    resolver: zodResolver(acceptSchema),
  });

  const { register: registerReject, handleSubmit: handleReject, reset: resetReject, formState: { errors: rejectErrors } } = useForm({
    resolver: zodResolver(rejectSchema),
  });

  const { register: registerApprove, handleSubmit: handleApprove, reset: resetApprove } = useForm({
    resolver: zodResolver(approveSchema),
  });

  const { register: registerRevise, handleSubmit: handleRevise, reset: resetRevise } = useForm({
    resolver: zodResolver(reviseSchema),
  });

  const approveMutation = useMutation({
    mutationFn: (params: { id: string; remarks?: string }) =>
      api.post(`/commercial/quotations/${params.id}/approve`, { remarks: params.remarks || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation-margins'] });
      toast.success('Quotation approved');
      setActionModal(null);
      resetApprove();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to approve quotation'),
  });

  const reviseMutation = useMutation({
    mutationFn: (params: { id: string; changeSummary?: string }) =>
      api.post(`/commercial/quotations/${params.id}/revise`, { changeSummary: params.changeSummary || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation-margins'] });
      toast.success('Revised quotation created');
      setActionModal(null);
      resetRevise();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to revise quotation'),
  });

  const acceptMutation = useMutation({
    mutationFn: (params: { id: string; projectName: string }) =>
      api.post(`/commercial/quotations/${params.id}/accept`, { projectName: params.projectName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation-margins'] });
      toast.success('Quotation accepted! Project created.');
      setActionModal(null);
      resetAccept();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to accept quotation'),
  });

  const rejectMutation = useMutation({
    mutationFn: (params: { id: string; reason: string }) =>
      api.post(`/commercial/quotations/${params.id}/reject`, { reason: params.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation-margins'] });
      toast.success('Quotation rejected');
      setActionModal(null);
      resetReject();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to reject quotation'),
  });

  const filtered = quotations?.filter((q: any) =>
    q.quotationNumber?.toLowerCase().includes(search.toLowerCase()) ||
    q.customerName?.toLowerCase().includes(search.toLowerCase()),
  );

  const columns = [
    { key: 'quotationNumber', header: 'Quotation #', render: (q: any) => <span className="font-mono text-cyan-300">{q.quotationNumber}</span> },
    { key: 'customerName', header: 'Customer' },
    { key: 'revisionNumber', header: 'Rev', render: (q: any) => q.revisionNumber != null ? `R${q.revisionNumber}` : '—' },
    { key: 'totalAmount', header: 'Amount', render: (q: any) => <span className="text-slate-200">{inr(Number(q.totalAmount))}</span> },
    {
      key: 'status', header: 'Status',
      render: (q: any) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[q.status] || statusColors.DRAFT}`}>{q.status}</span>
      ),
    },
    {
      key: 'actions', header: 'Actions',
      render: (q: any) => (
        <div className="flex items-center gap-2">
          {q.status === 'DRAFT' && (
            <button onClick={(e) => { e.stopPropagation(); sendMutation.mutate(q.id); }} className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-300 transition-colors" title="Send to customer">
              <Send className="w-4 h-4" />
            </button>
          )}
          {q.status === 'SENT' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setSelectedQuotation(q); setActionModal('approve'); }} className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-300 transition-colors" title="Approve quotation">
                <BadgeCheck className="w-4 h-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setSelectedQuotation(q); setActionModal('revise'); }} className="p-1.5 rounded-lg hover:bg-yellow-500/20 text-yellow-300 transition-colors" title="Create revised quotation">
                <RefreshCcw className="w-4 h-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setSelectedQuotation(q); setActionModal('accept'); }} className="p-1.5 rounded-lg hover:bg-green-500/20 text-green-300 transition-colors" title="Accept quotation">
                <CheckCircle className="w-4 h-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setSelectedQuotation(q); setActionModal('reject'); }} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-300 transition-colors" title="Reject quotation">
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          {(q.status === 'APPROVED' || q.status === 'ACCEPTED') && (
            <button onClick={(e) => { e.stopPropagation(); setSelectedQuotation(q); setActionModal('accept'); }} className="p-1.5 rounded-lg hover:bg-green-500/20 text-green-300 transition-colors" title="Accept quotation">
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          {q.status === 'PROJECT_CREATED' && (
            <button onClick={(e) => { e.stopPropagation(); navigate('/projects'); }} className="p-1.5 rounded-lg hover:bg-purple-500/20 text-purple-300 transition-colors" title="View project">
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
    { key: 'validUntil', header: 'Valid Until', render: (q: any) => q.validUntil ? new Date(q.validUntil).toLocaleDateString() : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Quotations</h1>
          <p className="text-sm text-slate-400 mt-1">Pricing, internal approval and order acceptance</p>
        </div>
      </div>
      {error && <div className="bg-red-500/10 border border-red-400/30 rounded-2xl p-4 text-sm text-red-300 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Failed to load quotations.</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <KpiCard title="Quoted Value" value={margin?.totalValue ?? 0} prefix="₹" displayValue={inr(margin?.totalValue)} icon={Receipt} variant="info" loading={!margin} insight="Sent + approved + accepted quotations" updatedAt={new Date().toLocaleDateString()} />
        <KpiCard title="Margin (₹)" value={margin?.totalMargin ?? 0} prefix="₹" displayValue={inr(margin?.totalMargin)} icon={TrendingUp} variant="success" loading={!margin} insight="Total value minus estimated cost" updatedAt={new Date().toLocaleDateString()} />
        <KpiCard title="Avg. Margin %" value={margin?.avgMarginPct ?? 0} suffix="%" icon={Percent} variant="warning" loading={!margin} insight="Weighted average across active quotes" updatedAt={new Date().toLocaleDateString()} />
        <KpiCard title="Quotations" value={margin?.count ?? 0} icon={IndianRupee} variant="danger" loading={!margin} insight="Quotations in the sales pipeline" updatedAt={new Date().toLocaleDateString()} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-slate-500" />
            <input type="text" placeholder="Search quotations..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-transparent border-0 focus:ring-0 text-sm text-white placeholder-slate-500" />
          </div>
        </CardHeader>
        <CardContent><DataTable columns={columns} data={filtered || []} loading={isLoading} /></CardContent>
      </Card>

      <Modal isOpen={actionModal === 'accept'} onClose={() => { setActionModal(null); resetAccept(); }} title={`Accept Quotation ${selectedQuotation?.quotationNumber ?? ''}`}>
        <form onSubmit={handleAccept((data: any) => acceptMutation.mutate({ id: selectedQuotation?.id, projectName: data.projectName }))} className="space-y-4">
          <p className="text-sm text-gray-600">Accepting this quotation will create a new project.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
            <input {...registerAccept('projectName')} className={`input-field ${acceptErrors.projectName ? 'border-red-400' : ''}`} placeholder="Enter project name" />
            {acceptErrors.projectName && <p className="mt-1 text-xs text-red-600">{acceptErrors.projectName.message?.toString()}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setActionModal(null); resetAccept(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={acceptMutation.isPending} className="btn-primary disabled:opacity-50">
              {acceptMutation.isPending ? 'Creating Project…' : 'Accept & Create Project'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={actionModal === 'reject'} onClose={() => { setActionModal(null); resetReject(); }} title={`Reject Quotation ${selectedQuotation?.quotationNumber ?? ''}`}>
        <form onSubmit={handleReject((data: any) => rejectMutation.mutate({ id: selectedQuotation?.id, reason: data.reason }))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <textarea {...registerReject('reason')} className={`input-field ${rejectErrors.reason ? 'border-red-400' : ''}`} rows={3} placeholder="Why is this quotation being rejected?" />
            {rejectErrors.reason && <p className="mt-1 text-xs text-red-600">{rejectErrors.reason.message?.toString()}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setActionModal(null); resetReject(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={rejectMutation.isPending} className="btn-danger disabled:opacity-50">
              {rejectMutation.isPending ? 'Rejecting…' : 'Reject Quotation'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={actionModal === 'approve'} onClose={() => { setActionModal(null); resetApprove(); }} title={`Approve Quotation ${selectedQuotation?.quotationNumber ?? ''}`}>
        <form onSubmit={handleApprove((data: any) => approveMutation.mutate({ id: selectedQuotation?.id, remarks: data.remarks }))} className="space-y-4">
          <p className="text-sm text-gray-600">Internal approval gate — the quotation becomes approved and moves toward acceptance.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
            <textarea {...registerApprove('remarks')} className="input-field" rows={3} placeholder="e.g. Approved in commercial review" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setActionModal(null); resetApprove(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={approveMutation.isPending} className="btn-primary disabled:opacity-50">
              {approveMutation.isPending ? 'Approving…' : 'Approve Quotation'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={actionModal === 'revise'} onClose={() => { setActionModal(null); resetRevise(); }} title={`Revise Quotation ${selectedQuotation?.quotationNumber ?? ''}`}>
        <form onSubmit={handleRevise((data: any) => reviseMutation.mutate({ id: selectedQuotation?.id, changeSummary: data.changeSummary }))} className="space-y-4">
          <p className="text-sm text-gray-600">Creates a new revision of the quotation (bumps the revision number). Pricing can be updated after revising.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Change Summary (optional)</label>
            <textarea {...registerRevise('changeSummary')} className="input-field" rows={3} placeholder="e.g. Revised pricing per customer feedback" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setActionModal(null); resetRevise(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={reviseMutation.isPending} className="btn-primary disabled:opacity-50">
              {reviseMutation.isPending ? 'Revising…' : 'Create Revision'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
