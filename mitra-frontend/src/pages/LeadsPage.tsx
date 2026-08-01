import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { KpiCard } from '../components/KpiCard';
import { Plus, Search, Users, Target, IndianRupee, CheckCircle2, ArrowRightCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const inr = (n?: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const leadSchema = z.object({
  customerName: z.string().min(2, 'Customer name is required'),
  leadSource: z.string().optional(),
  leadStatus: z.string().optional(),
  priority: z.string().optional(),
  expectedRevenue: z.string().optional(),
  expectedDate: z.string().optional(),
  probability: z.string().optional(),
  notes: z.string().optional(),
});

const convertSchema = z.object({
  customerName: z.string().min(2, 'Customer name is required'),
  industry: z.string().optional(),
  gstNumber: z.string().optional(),
});

const SOURCES = ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EXHIBITION', 'SOCIAL_MEDIA', 'EMAIL', 'PHONE', 'WALK_IN', 'OTHER'];
const LEAD_STATUSES = ['NEW', 'QUALIFIED', 'PROPOSAL', 'CONVERTED', 'WON', 'LOST', 'DISQUALIFIED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const statusColors: Record<string, string> = {
  NEW: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30',
  QUALIFIED: 'bg-blue-500/15 text-blue-300 border-blue-400/30',
  PROPOSAL: 'bg-violet-500/15 text-violet-300 border-violet-400/30',
  CONVERTED: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  WON: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  LOST: 'bg-red-500/15 text-red-300 border-red-400/30',
  DISQUALIFIED: 'bg-gray-500/15 text-gray-300 border-gray-400/30',
};

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-500/15 text-gray-300 border-gray-400/30',
  MEDIUM: 'bg-yellow-500/15 text-yellow-300 border-yellow-400/30',
  HIGH: 'bg-orange-500/15 text-orange-300 border-orange-400/30',
  CRITICAL: 'bg-red-500/15 text-red-300 border-red-400/30',
};

type Lead = {
  id: string;
  leadNumber: string;
  customerName: string;
  leadSource: string;
  leadStatus: string;
  priority: string;
  expectedRevenue: number | null;
  expectedDate: string | null;
  probability: number;
  convertedCustomerId: string | null;
};

export function LeadsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [converting, setConverting] = useState<Lead | null>(null);
  const queryClient = useQueryClient();

  const { data: res, isLoading, error } = useQuery({
    queryKey: ['leads', page, search, status, priority],
    queryFn: () => api.get('/commercial/leads', { params: { page, limit: 20, search, leadStatus: status || undefined, priority: priority || undefined } }).then(r => {
      const p = r.data;
      return Array.isArray(p) ? { data: p, total: p.length } : (p?.data ? p : { data: p?.data ?? [], total: p?.total ?? 0 });
    }),
    retry: 2, staleTime: 60 * 1000,
  });
  const leads: Lead[] = res?.data ?? [];
  const total = res?.total ?? leads.length;

  const { data: pipeline } = useQuery({
    queryKey: ['leads-pipeline'],
    queryFn: () => api.get('/commercial/leads/pipeline').then(r => (r.data ?? {}) as any),
    retry: 2, staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/commercial/leads', {
      ...data,
      expectedRevenue: data.expectedRevenue ? Number(data.expectedRevenue) : undefined,
      probability: data.probability ? Number(data.probability) : undefined,
      expectedDate: data.expectedDate || undefined,
      leadSource: data.leadSource || undefined,
      leadStatus: data.leadStatus || undefined,
      priority: data.priority || undefined,
    }),
    onError: (err) => toast.error((err as any)?.response?.data?.message || 'Failed to create lead'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads'] }); queryClient.invalidateQueries({ queryKey: ['leads-pipeline'] }); toast.success('Lead created'); setIsCreateOpen(false); },
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.post(`/commercial/leads/${id}/convert`, data),
    onError: (err) => toast.error((err as any)?.response?.data?.message || 'Failed to convert lead'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads'] }); queryClient.invalidateQueries({ queryKey: ['leads-pipeline'] }); toast.success('Lead converted to customer'); setConverting(null); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/commercial/leads/${id}`),
    onError: (err) => toast.error((err as any)?.response?.data?.message || 'Failed to delete lead'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads'] }); queryClient.invalidateQueries({ queryKey: ['leads-pipeline'] }); toast.success('Lead deleted'); },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(leadSchema) });
  const convertForm = useForm({ resolver: zodResolver(convertSchema) });

  const columns = [
    { key: 'leadNumber', header: 'Lead #', render: (l: Lead) => <span className="font-mono text-cyan-300">{l.leadNumber}</span> },
    { key: 'customerName', header: 'Customer' },
    { key: 'leadSource', header: 'Source', render: (l: Lead) => <span className="text-slate-400">{l.leadSource || '—'}</span> },
    { key: 'leadStatus', header: 'Status', render: (l: Lead) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[l.leadStatus] || statusColors.NEW}`}>{l.leadStatus}</span>
    )},
    { key: 'priority', header: 'Priority', render: (l: Lead) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${priorityColors[l.priority] || priorityColors.MEDIUM}`}>{l.priority}</span>
    )},
    { key: 'probability', header: 'Prob.', render: (l: Lead) => <span className="text-slate-300">{l.probability ?? 0}%</span> },
    { key: 'expectedRevenue', header: 'Expected Revenue', render: (l: Lead) => <span className="text-slate-200">{inr(l.expectedRevenue)}</span> },
    { key: 'expectedDate', header: 'Expected Date', render: (l: Lead) => l.expectedDate ? new Date(l.expectedDate).toLocaleDateString() : '—' },
    { key: 'actions', header: 'Actions', render: (l: Lead) => (
      <div className="flex items-center gap-2">
        {l.leadStatus !== 'CONVERTED' && !l.convertedCustomerId && (
          <button
            onClick={() => { convertForm.reset({ customerName: l.customerName, industry: '', gstNumber: '' }); setConverting(l); }}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/25 transition-colors"
          >
            Convert
          </button>
        )}
        <button
          onClick={() => { if (window.confirm(`Delete lead ${l.leadNumber}?`)) removeMutation.mutate(l.id); }}
          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/10 border border-red-400/20 text-red-300 hover:bg-red-500/20 transition-colors"
        >
          Delete
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Lead Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Track, qualify and convert sales opportunities</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/25 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Lead
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-400/30 rounded-2xl p-4 text-sm text-red-300">
          Failed to load leads. Please try again.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <KpiCard title="Total Leads" value={pipeline?.total ?? 0} icon={Users} variant="info" loading={!pipeline} insight="All leads across every stage" updatedAt={new Date().toLocaleDateString()} />
        <KpiCard title="Open Pipeline" value={pipeline?.open ?? 0} icon={Target} variant="success" loading={!pipeline} insight="NEW + QUALIFIED + PROPOSAL leads" updatedAt={new Date().toLocaleDateString()} />
        <KpiCard title="Pipeline Value" value={pipeline?.pipelineValue ?? 0} prefix="₹" displayValue={inr(pipeline?.pipelineValue)} icon={IndianRupee} variant="warning" loading={!pipeline} insight="Weighted by probability" updatedAt={new Date().toLocaleDateString()} />
        <KpiCard title="Converted" value={pipeline?.converted ?? 0} icon={CheckCircle2} variant="danger" loading={!pipeline} insight="Leads won as customers" updatedAt={new Date().toLocaleDateString()} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[220px]">
              <Search className="w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Search by customer or lead number…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="flex-1 bg-transparent border-0 focus:ring-0 text-sm text-white placeholder-slate-500"
              />
            </div>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-400/40">
              <option value="">All statuses</option>
              {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={priority} onChange={e => { setPriority(e.target.value); setPage(1); }} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-400/40">
              <option value="">All priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={leads} loading={isLoading} />
          <div className="flex items-center justify-between pt-4 text-sm text-slate-400">
            <span>Page {page} · {total} lead{total === 1 ? '' : 's'}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-40 transition-colors">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={leads.length < 20} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-40 transition-colors">Next</button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); reset(); }} title="Create New Lead">
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
            <input {...register('customerName')} className={`input-field ${errors.customerName ? 'border-red-400' : ''}`} placeholder="e.g. Acme Automotive Pvt Ltd" />
            {errors.customerName && <p className="mt-1 text-xs text-red-600">{errors.customerName.message?.toString()}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select {...register('leadSource')} className="input-field">
                <option value="">Select…</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select {...register('leadStatus')} className="input-field">
                <option value="">NEW (default)</option>
                {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select {...register('priority')} className="input-field">
                <option value="">MEDIUM (default)</option>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Revenue (₹)</label>
              <input type="number" min={0} {...register('expectedRevenue')} className="input-field" placeholder="e.g. 2500000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Date</label>
              <input type="date" {...register('expectedDate')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Probability (%)</label>
              <input type="number" min={0} max={100} {...register('probability')} className="input-field" placeholder="e.g. 40" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea {...register('notes')} className="input-field" rows={3} placeholder="Context, next steps, follow-up…" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setIsCreateOpen(false); reset(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary disabled:opacity-50">{createMutation.isPending ? 'Creating…' : 'Create Lead'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!converting} onClose={() => setConverting(null)} title={`Convert Lead ${converting?.leadNumber ?? ''}`}>
        <p className="text-sm text-gray-600 mb-4">This will create a customer record and mark the lead as converted.</p>
        <form onSubmit={convertForm.handleSubmit((data) => converting && convertMutation.mutate({ id: converting.id, data }))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
            <input {...convertForm.register('customerName')} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
            <input {...convertForm.register('industry')} className="input-field" placeholder="e.g. automotive" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
            <input {...convertForm.register('gstNumber')} className="input-field" placeholder="e.g. 27AAPCA1234F1Z5" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setConverting(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={convertMutation.isPending} className="btn-primary disabled:opacity-50 flex items-center gap-2">
              {convertMutation.isPending ? 'Converting…' : <><ArrowRightCircle className="w-4 h-4" /> Convert</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
