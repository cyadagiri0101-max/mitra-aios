import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Modal } from '../components/Modal';
import { DataTable } from '../components/DataTable';
import { ArrowLeft, Check, Circle, Loader2, Plus, Trash2, History, Package, FileText, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const RFQ_TRACK = ['DRAFT', 'SUBMITTED', 'TECHNICAL_REVIEW', 'COMMERCIAL_REVIEW', 'APPROVED', 'QUOTED', 'ACCEPTED', 'PROJECT_READY'];

const stateColors: Record<string, string> = {
  DRAFT: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
  SUBMITTED: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30',
  TECHNICAL_REVIEW: 'bg-blue-500/15 text-blue-300 border-blue-400/30',
  COMMERCIAL_REVIEW: 'bg-violet-500/15 text-violet-300 border-violet-400/30',
  APPROVED: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  QUOTED: 'bg-teal-500/15 text-teal-300 border-teal-400/30',
  ACCEPTED: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  PROJECT_READY: 'bg-green-500/15 text-green-300 border-green-400/30',
  REJECTED: 'bg-red-500/15 text-red-300 border-red-400/30',
  CANCELLED: 'bg-gray-500/15 text-gray-300 border-gray-400/30',
};

const transitionSchema = z.object({ remarks: z.string().optional() });
const revisionSchema = z.object({ changeSummary: z.string().min(2, 'Describe the change') });
const productSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  productCode: z.string().optional(),
  description: z.string().optional(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  material: z.string().optional(),
  targetPrice: z.string().optional(),
  deliveryWeeks: z.string().optional(),
});

type Transition = {
  id: string;
  name: string;
  fromStateId: string;
  toStateId: string;
  requiresApproval?: boolean;
  requiredRoles?: string[] | null;
};

export function RfqDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTransition, setSelectedTransition] = useState<Transition | null>(null);
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);

  const { data: rfq, isLoading, error } = useQuery({
    queryKey: ['rfq', id],
    queryFn: () => api.get(`/commercial/rfqs/${id}`).then(r => (r.data ?? {}) as any),
    retry: 2, staleTime: 30 * 1000, enabled: !!id,
  });

  const { data: transitions } = useQuery({
    queryKey: ['rfq-transitions', id],
    queryFn: () => api.get(`/commercial/rfqs/${id}/transitions`).then(r => {
      const p = r.data;
      return Array.isArray(p) ? p : (p?.data ?? []);
    }),
    retry: 2, staleTime: 30 * 1000, enabled: !!id,
  });

  const transitionMutation = useMutation({
    mutationFn: ({ transitionId, remarks }: { transitionId: string; remarks?: string }) => api.post(`/commercial/rfqs/${id}/transition`, { transitionId, remarks: remarks || undefined }),
    onError: (err) => toast.error((err as any)?.response?.data?.message || 'Transition failed'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfq', id] });
      queryClient.invalidateQueries({ queryKey: ['rfq-transitions', id] });
      toast.success('Workflow advanced');
      setSelectedTransition(null);
    },
  });

  const revisionMutation = useMutation({
    mutationFn: (data: any) => api.post(`/commercial/rfqs/${id}/revisions`, data),
    onError: (err) => toast.error((err as any)?.response?.data?.message || 'Failed to create revision'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rfq', id] }); toast.success('Revision created'); setIsRevisionOpen(false); },
  });

  const productMutation = useMutation({
    mutationFn: (data: any) => api.post(`/commercial/rfqs/${id}/products`, {
      ...data,
      quantity: data.quantity ? Number(data.quantity) : undefined,
      targetPrice: data.targetPrice ? Number(data.targetPrice) : undefined,
      deliveryWeeks: data.deliveryWeeks ? Number(data.deliveryWeeks) : undefined,
    }),
    onError: (err) => toast.error((err as any)?.response?.data?.message || 'Failed to add product'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rfq', id] }); toast.success('Product added'); setIsProductOpen(false); },
  });

  const removeProductMutation = useMutation({
    mutationFn: (productId: string) => api.delete(`/commercial/rfqs/${id}/products/${productId}`),
    onError: (err) => toast.error((err as any)?.response?.data?.message || 'Failed to remove product'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rfq', id] }); toast.success('Product removed'); },
  });

  const transitionForm = useForm({ resolver: zodResolver(transitionSchema) });
  const revisionForm = useForm({ resolver: zodResolver(revisionSchema) });
  const productForm = useForm({ resolver: zodResolver(productSchema) });

  const currentState = rfq?.workflowState ?? 'DRAFT';
  const currentIndex = RFQ_TRACK.indexOf(currentState);
  const trackStatus = (code: string) =>
    currentIndex === -1 ? (currentState === code ? 'current' : 'pending') as 'current' | 'pending'
      : RFQ_TRACK.indexOf(code) < currentIndex ? 'completed' as const
      : RFQ_TRACK.indexOf(code) === currentIndex ? 'current' as const
      : 'pending' as const;

  const productColumns = [
    { key: 'lineNumber', header: '#', render: (p: any) => <span className="text-slate-500">{p.lineNumber}</span> },
    { key: 'productName', header: 'Product' },
    { key: 'productCode', header: 'Code', render: (p: any) => <span className="text-slate-400">{p.productCode || '—'}</span> },
    { key: 'quantity', header: 'Qty', render: (p: any) => <span>{p.quantity} {p.unit || ''}</span> },
    { key: 'material', header: 'Material', render: (p: any) => <span className="text-slate-400">{p.material || '—'}</span> },
    { key: 'targetPrice', header: 'Target Price', render: (p: any) => p.targetPrice ? `₹${Number(p.targetPrice).toLocaleString('en-IN')}` : '—' },
    { key: 'deliveryWeeks', header: 'Delivery', render: (p: any) => p.deliveryWeeks ? `${p.deliveryWeeks} wks` : '—' },
    { key: 'actions', header: '', render: (p: any) => (
      <button
        onClick={() => { if (window.confirm('Remove this product line?')) removeProductMutation.mutate(p.id); }}
        className="text-red-400/70 hover:text-red-300 transition-colors"
        aria-label="Remove product"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    )},
  ];

  const revisionColumns = [
    { key: 'revisionNumber', header: 'Rev', render: (r: any) => <span className="font-mono text-cyan-300">R{r.revisionNumber}</span> },
    { key: 'changeSummary', header: 'Change Summary' },
    { key: 'changedFields', header: 'Changed Fields', render: (r: any) => Array.isArray(r.changedFields) ? r.changedFields.join(', ') : '—' },
    { key: 'createdAt', header: 'Created', render: (r: any) => new Date(r.createdAt).toLocaleString() },
  ];

  const quotationColumns = [
    { key: 'quotationNumber', header: 'Quotation #', render: (q: any) => <span className="font-mono text-cyan-300">{q.quotationNumber}</span> },
    { key: 'totalAmount', header: 'Total', render: (q: any) => `₹${Number(q.totalAmount ?? 0).toLocaleString('en-IN')}` },
    { key: 'status', header: 'Status', render: (q: any) => <span className="text-slate-300">{q.status}</span> },
  ];

  if (isLoading) {
    return <div className="flex items-center gap-3 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading RFQ…</div>;
  }
  if (error || !rfq) {
    return <div className="bg-red-500/10 border border-red-400/30 rounded-2xl p-4 text-sm text-red-300">Failed to load RFQ.</div>;
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/rfqs')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to RFQs
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white font-mono">{rfq.rfqNumber}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${stateColors[currentState] || stateColors.DRAFT}`}>{currentState}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${stateColors[rfq.approvalStatus] || stateColors.DRAFT}`}>{rfq.approvalStatus}</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">{rfq.customerName} · Rev R{rfq.revisionNumber ?? 0}</p>
        </div>
        <button
          onClick={() => setIsRevisionOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 transition-colors"
        >
          <History className="w-4 h-4" /> New Revision
        </button>
      </div>

      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2"><ChevronRight className="w-4 h-4 text-cyan-400" /> RFQ Workflow</h3>
            <span className="text-xs text-slate-500">{currentIndex === -1 ? '—' : `Step ${currentIndex + 1} of ${RFQ_TRACK.length}`}</span>
          </div>
          <div className="relative">
            <div className="absolute top-5 left-4 right-4 h-0.5 bg-white/10">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-700" style={{ width: `${currentIndex === -1 ? 0 : (currentIndex / (RFQ_TRACK.length - 1)) * 100}%` }} />
            </div>
            <div className="flex items-center justify-between relative">
              {RFQ_TRACK.map((code) => {
                const status = trackStatus(code);
                return (
                  <div key={code} className="flex flex-col items-center relative z-10 w-12">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      status === 'completed'
                        ? 'bg-emerald-500/90 border-emerald-400'
                        : status === 'current'
                          ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.35)]'
                          : 'bg-white/5 border-white/10'
                    }`}>
                      {status === 'completed' && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                      {status === 'current' && <Loader2 className="w-5 h-5 text-cyan-300 animate-spin" />}
                      {status === 'pending' && <Circle className="w-4 h-4 text-slate-500" />}
                    </div>
                    <span className={`mt-2 text-[10px] font-medium text-center leading-tight ${status === 'completed' ? 'text-emerald-300' : status === 'current' ? 'text-cyan-300' : 'text-slate-500'}`}>
                      {code.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-3">Available Actions</h3>
            {!transitions || transitions.length === 0 ? (
              <p className="text-sm text-slate-500">No transitions available from the current state.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {(transitions as Transition[]).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { transitionForm.reset({ remarks: '' }); setSelectedTransition(t); }}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/25 transition-colors"
                  >
                    {t.name}
                    {t.requiresApproval && <span className="ml-2 text-[10px] text-yellow-300/80">APPROVAL</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Package className="w-4 h-4 text-cyan-400" /> Products</CardTitle></CardHeader>
          <CardContent>
            <div className="flex justify-end mb-3">
              <button onClick={() => { productForm.reset(); setIsProductOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/25 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Product
              </button>
            </div>
            <DataTable columns={productColumns} data={rfq.products ?? []} loading={isLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Mold Type</span><span className="text-slate-200">{rfq.moldType || '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Priority</span><span className="text-slate-200">{rfq.priority}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Target Qty</span><span className="text-slate-200">{rfq.targetQuantity ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Annual Volume</span><span className="text-slate-200">{rfq.annualVolume ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Material</span><span className="text-slate-200">{rfq.material || '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Due Date</span><span className="text-slate-200">{rfq.dueDate ? new Date(rfq.dueDate).toLocaleDateString() : '—'}</span></div>
            {rfq.machineDetails && (
              <div className="pt-2 border-t border-white/10">
                <p className="text-slate-500 mb-1">Machine Details</p>
                <p className="text-slate-200">{rfq.machineDetails}</p>
              </div>
            )}
            {rfq.technicalNotes && (
              <div className="pt-2 border-t border-white/10">
                <p className="text-slate-500 mb-1">Technical Notes</p>
                <p className="text-slate-200">{rfq.technicalNotes}</p>
              </div>
            )}
            <div className="pt-2 border-t border-white/10">
              <p className="text-slate-500 mb-1">Workflow History</p>
              {rfq.workflow?.history?.length ? (
                <ul className="space-y-2">
                  {(rfq.workflow.history as any[]).map((h: any, i: number) => (
                    <li key={i} className="text-xs text-slate-400 flex items-center gap-2">
                      <span className="text-cyan-400 font-mono">{h.fromStateCode ?? h.fromState ?? '—'}</span>
                      <ChevronRight className="w-3 h-3 text-slate-600" />
                      <span className="text-slate-200 font-mono">{h.toStateCode ?? h.toState ?? '—'}</span>
                      {h.actorName && <span className="ml-auto text-slate-500">{h.actorName}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">No workflow events yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="w-4 h-4 text-cyan-400" /> Revision History</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={revisionColumns} data={rfq.revisions ?? []} loading={isLoading} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-4 h-4 text-cyan-400" /> Linked Quotations</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={quotationColumns} data={rfq.quotations ?? []} loading={isLoading} />
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={!!selectedTransition} onClose={() => setSelectedTransition(null)} title={`Execute: ${selectedTransition?.name ?? ''}`}>
        <form onSubmit={transitionForm.handleSubmit((data) => selectedTransition && transitionMutation.mutate({ transitionId: selectedTransition.id, remarks: data.remarks }))} className="space-y-4">
          <p className="text-sm text-gray-600">Advance the RFQ through the configured workflow. The transition is recorded in the audit trail.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
            <textarea {...transitionForm.register('remarks')} className="input-field" rows={3} placeholder="e.g. Approved in commercial review" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setSelectedTransition(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={transitionMutation.isPending} className="btn-primary disabled:opacity-50">{transitionMutation.isPending ? 'Advancing…' : 'Advance Workflow'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isRevisionOpen} onClose={() => setIsRevisionOpen(false)} title="Create RFQ Revision">
        <form onSubmit={revisionForm.handleSubmit((data) => revisionMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Change Summary *</label>
            <textarea {...revisionForm.register('changeSummary')} className={`input-field ${revisionForm.formState.errors.changeSummary ? 'border-red-400' : ''}`} rows={3} placeholder="e.g. Revised material from P20 to S136" />
            {revisionForm.formState.errors.changeSummary && <p className="mt-1 text-xs text-red-600">{revisionForm.formState.errors.changeSummary.message?.toString()}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsRevisionOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={revisionMutation.isPending} className="btn-primary disabled:opacity-50">{revisionMutation.isPending ? 'Creating…' : 'Create Revision'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isProductOpen} onClose={() => setIsProductOpen(false)} title="Add Product Line">
        <form onSubmit={productForm.handleSubmit((data) => productMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input {...productForm.register('productName')} className={`input-field ${productForm.formState.errors.productName ? 'border-red-400' : ''}`} placeholder="e.g. Dashboard Panel" />
            {productForm.formState.errors.productName && <p className="mt-1 text-xs text-red-600">{productForm.formState.errors.productName.message?.toString()}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Code</label>
              <input {...productForm.register('productCode')} className="input-field" placeholder="DP-001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" min={0} {...productForm.register('quantity')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
              <input {...productForm.register('material')} className="input-field" placeholder="e.g. ABS" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input {...productForm.register('unit')} className="input-field" placeholder="NOS" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Price (₹)</label>
              <input type="number" min={0} {...productForm.register('targetPrice')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery (weeks)</label>
              <input type="number" min={0} {...productForm.register('deliveryWeeks')} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...productForm.register('description')} className="input-field" rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsProductOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={productMutation.isPending} className="btn-primary disabled:opacity-50">{productMutation.isPending ? 'Adding…' : 'Add Product'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
