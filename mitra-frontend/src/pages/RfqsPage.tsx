import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { KpiCard } from '../components/KpiCard';
import { Plus, Search, ClipboardList, FileCheck2, Timer, CircleDollarSign, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const RFQ_STATES = ['DRAFT', 'SUBMITTED', 'TECHNICAL_REVIEW', 'COMMERCIAL_REVIEW', 'APPROVED', 'QUOTED', 'ACCEPTED', 'PROJECT_READY', 'REJECTED', 'CANCELLED'];
const MOLD_TYPES = ['INJECTION', 'COMPRESSION', 'BLOW', 'DIE_CASTING', 'VACUUM', 'THERMOFORMING', 'OTHER'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

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

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-500/15 text-gray-300 border-gray-400/30',
  MEDIUM: 'bg-yellow-500/15 text-yellow-300 border-yellow-400/30',
  HIGH: 'bg-orange-500/15 text-orange-300 border-orange-400/30',
  CRITICAL: 'bg-red-500/15 text-red-300 border-red-400/30',
};

const rfqSchema = z.object({
  customerName: z.string().min(2, 'Customer name is required'),
  moldType: z.string().optional(),
  priority: z.string().optional(),
  targetQuantity: z.string().optional(),
  annualVolume: z.string().optional(),
  material: z.string().optional(),
  machineDetails: z.string().optional(),
  dueDate: z.string().optional(),
  technicalNotes: z.string().optional(),
});

type Rfq = {  id: string;
  rfqNumber: string;
  customerName: string;
  moldType: string | null;
  priority: string;
  workflowState: string;
  approvalStatus: string;
  status: string;
  revisionNumber: number;
  dueDate: string | null;
  products: { id: string; productName: string; quantity: number }[];
};

export function RfqsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: res, isLoading, error } = useQuery({
    queryKey: ['rfqs', page, search, state, priority],
    queryFn: () => api.get('/commercial/rfqs', { params: { page, limit: 20, search, workflowState: state || undefined, priority: priority || undefined } }).then(r => {
      const p = r.data;
      return Array.isArray(p) ? { data: p, total: p.length } : { data: p?.data ?? [], total: p?.total ?? 0 };
    }),
    retry: 2, staleTime: 60 * 1000,
  });
  const rfqs: Rfq[] = res?.data ?? [];
  const total = res?.total ?? rfqs.length;

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<any>({
    resolver: zodResolver(rfqSchema),
    defaultValues: { customerName: '', products: [{ productName: '', quantity: '1' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'products' as never });

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      const products = (data.products ?? []).filter((p: any) => p.productName).map((p: any) => ({
        productName: p.productName,
        productCode: p.productCode || undefined,
        description: p.description || undefined,
        quantity: p.quantity ? Number(p.quantity) : undefined,
        unit: p.unit || undefined,
        material: p.material || undefined,
        targetPrice: p.targetPrice ? Number(p.targetPrice) : undefined,
        deliveryWeeks: p.deliveryWeeks ? Number(p.deliveryWeeks) : undefined,
      }));
      return api.post('/commercial/rfqs', {
        customerName: data.customerName,
        moldType: data.moldType || undefined,
        priority: data.priority || undefined,
        targetQuantity: data.targetQuantity ? Number(data.targetQuantity) : undefined,
        annualVolume: data.annualVolume ? Number(data.annualVolume) : undefined,
        material: data.material || undefined,
        machineDetails: data.machineDetails || undefined,
        dueDate: data.dueDate || undefined,
        technicalNotes: data.technicalNotes || undefined,
        products,
      });
    },
    onError: (err) => toast.error((err as any)?.response?.data?.message || 'Failed to create RFQ'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rfqs'] }); toast.success('RFQ created'); setIsCreateOpen(false); reset(); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/commercial/rfqs/${id}`),
    onError: (err) => toast.error((err as any)?.response?.data?.message || 'Failed to delete RFQ'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rfqs'] }); toast.success('RFQ deleted'); },
  });

  const columns = [
    { key: 'rfqNumber', header: 'RFQ #', render: (r: Rfq) => <button onClick={() => navigate(`/rfqs/${r.id}`)} className="font-mono text-cyan-300 hover:text-cyan-200 hover:underline">{r.rfqNumber}</button> },
    { key: 'customerName', header: 'Customer' },
    { key: 'moldType', header: 'Mold Type', render: (r: Rfq) => <span className="text-slate-400">{r.moldType || '—'}</span> },
    { key: 'products', header: 'Products', render: (r: Rfq) => <span className="text-slate-300">{r.products?.length ?? 0}</span> },
    { key: 'workflowState', header: 'Workflow', render: (r: Rfq) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${stateColors[r.workflowState] || stateColors.DRAFT}`}>{r.workflowState}</span>
    )},
    { key: 'priority', header: 'Priority', render: (r: Rfq) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${priorityColors[r.priority] || priorityColors.MEDIUM}`}>{r.priority}</span>
    )},
    { key: 'dueDate', header: 'Due Date', render: (r: Rfq) => r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—' },
    { key: 'actions', header: 'Actions', render: (r: Rfq) => (
      <button
        onClick={() => { if (window.confirm(`Delete RFQ ${r.rfqNumber}?`)) removeMutation.mutate(r.id); }}
        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/10 border border-red-400/20 text-red-300 hover:bg-red-500/20 transition-colors"
      >
        Delete
      </button>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">RFQ Management</h1>
          <p className="text-sm text-slate-400 mt-1">Request for quotations with configurable workflow</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/25 transition-colors"
        >
          <Plus className="w-4 h-4" /> New RFQ
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-400/30 rounded-2xl p-4 text-sm text-red-300">
          Failed to load RFQs. Please try again.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <KpiCard title="Total RFQs" value={total} icon={ClipboardList} variant="info" loading={isLoading} insight="All requests received" updatedAt={new Date().toLocaleDateString()} />
        <KpiCard title="In Review" value={rfqs.filter(r => ['TECHNICAL_REVIEW', 'COMMERCIAL_REVIEW'].includes(r.workflowState)).length} icon={Timer} variant="warning" loading={isLoading} insight="Technical or commercial review" updatedAt={new Date().toLocaleDateString()} />
        <KpiCard title="Approved" value={rfqs.filter(r => r.workflowState === 'APPROVED').length} icon={FileCheck2} variant="success" loading={isLoading} insight="Ready for quotation" updatedAt={new Date().toLocaleDateString()} />
        <KpiCard title="Accepted" value={rfqs.filter(r => r.workflowState === 'ACCEPTED' || r.workflowState === 'PROJECT_READY').length} icon={CircleDollarSign} variant="danger" loading={isLoading} insight="Order won — project ready" updatedAt={new Date().toLocaleDateString()} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[220px]">
              <Search className="w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Search by RFQ number or customer…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="flex-1 bg-transparent border-0 focus:ring-0 text-sm text-white placeholder-slate-500"
              />
            </div>
            <select value={state} onChange={e => { setState(e.target.value); setPage(1); }} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-400/40">
              <option value="">All states</option>
              {RFQ_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={priority} onChange={e => { setPriority(e.target.value); setPage(1); }} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-400/40">
              <option value="">All priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={rfqs} loading={isLoading} />
          <div className="flex items-center justify-between pt-4 text-sm text-slate-400">
            <span>Page {page} · {total} RFQ{total === 1 ? '' : 's'}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-40 transition-colors">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={rfqs.length < 20} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-40 transition-colors">Next</button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); reset(); }} title="Create New RFQ" size="xl">
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
            <input {...register('customerName')} className={`input-field ${errors.customerName ? 'border-red-400' : ''}`} placeholder="e.g. Acme Automotive Pvt Ltd" />
            {errors.customerName && <p className="mt-1 text-xs text-red-600">{errors.customerName.message?.toString()}</p>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mold Type</label>
              <select {...register('moldType')} className="input-field">
                <option value="">Select…</option>
                {MOLD_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select {...register('priority')} className="input-field">
                <option value="">MEDIUM (default)</option>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date" {...register('dueDate')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Quantity</label>
              <input type="number" min={0} {...register('targetQuantity')} className="input-field" placeholder="e.g. 1000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Annual Volume</label>
              <input type="number" min={0} {...register('annualVolume')} className="input-field" placeholder="e.g. 120000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
              <input {...register('material')} className="input-field" placeholder="e.g. P20 Steel" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Machine Details</label>
            <input {...register('machineDetails')} className="input-field" placeholder="e.g. 130T injection molding machine, 4 cavities" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technical Notes</label>
            <textarea {...register('technicalNotes')} className="input-field" rows={2} placeholder="Gate location, tolerances, surface finish…" />
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-800">Product Lines</label>
              <button type="button" onClick={() => append({ productName: '', quantity: '1' })} className="text-sm text-cyan-600 hover:text-cyan-700 font-medium">+ Add product</button>
            </div>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="border border-gray-200 rounded-lg p-3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Product Name *</label>
                      <input {...register(`products.${index}.productName` as never)} className="input-field text-sm" placeholder="e.g. Dashboard Panel" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
                      <input {...register(`products.${index}.productCode` as never)} className="input-field text-sm" placeholder="DP-001" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                      <input type="number" min={0} {...register(`products.${index}.quantity` as never)} className="input-field text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Material</label>
                      <input {...register(`products.${index}.material` as never)} className="input-field text-sm" placeholder="e.g. ABS" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Target Price (₹)</label>
                      <input type="number" min={0} {...register(`products.${index}.targetPrice` as never)} className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Delivery (weeks)</label>
                      <input type="number" min={0} {...register(`products.${index}.deliveryWeeks` as never)} className="input-field text-sm" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="button" onClick={() => remove(index)} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setIsCreateOpen(false); reset(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary disabled:opacity-50">{createMutation.isPending ? 'Creating…' : 'Create RFQ'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
