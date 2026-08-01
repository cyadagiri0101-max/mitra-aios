import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { listRisks, getRiskDashboard, createRisk, updateRisk, closeRisk, removeRisk, getRiskPrediction, getDelayPrediction, getProject } from '../utils/projectApi';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { ArrowLeft, Plus, Sparkles, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const riskSchema = z.object({
  title: z.string().min(3, 'Title required').max(200),
  description: z.string().optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
  likelihood: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  impact: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  mitigationPlan: z.string().optional().or(z.literal('')),
});

const SEV_COLORS: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700', MEDIUM: 'bg-amber-100 text-amber-700', HIGH: 'bg-rose-100 text-rose-700',
};
const EXPOSURE_COLORS: Record<string, string> = {
  LOW: 'text-green-400', MEDIUM: 'text-amber-400', HIGH: 'text-rose-400',
};

export function ProjectRisksPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data } = useQuery({ queryKey: ['risks', id], queryFn: () => listRisks(id).then(r => r.data) });
  const { data: dashData } = useQuery({ queryKey: ['riskDashboard', id], queryFn: () => getRiskDashboard(id).then(r => r.data), enabled: !!id });
  const { data: projectData } = useQuery({ queryKey: ['project', id], queryFn: () => getProject(id).then(r => r.data) });
  const { data: aiRisk } = useQuery({ queryKey: ['aiRisk', id], queryFn: () => getRiskPrediction(id).then(r => r.data), enabled: !!id });
  const { data: aiDelay } = useQuery({ queryKey: ['aiDelay', id], queryFn: () => getDelayPrediction(id).then(r => r.data), enabled: !!id });

  const risks = data?.data ?? data ?? [];
  const dash = dashData?.data ?? dashData;
  const project = projectData?.data ?? projectData;

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(riskSchema) });

  const saveMutation = useMutation({
    mutationFn: (payload: any) => editing ? updateRisk(id, editing.id, payload) : createRisk(id, payload),
    onSuccess: () => { toast.success(editing ? 'Risk updated' : 'Risk created'); queryClient.invalidateQueries({ queryKey: ['risks', id] }); queryClient.invalidateQueries({ queryKey: ['riskDashboard', id] }); setModalOpen(false); setEditing(null); reset(); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Save failed'),
  });

  const closeMutation = useMutation({
    mutationFn: (rid: string) => closeRisk(id, rid),
    onSuccess: () => { toast.success('Risk closed'); queryClient.invalidateQueries({ queryKey: ['risks', id] }); queryClient.invalidateQueries({ queryKey: ['riskDashboard', id] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Close failed'),
  });

  const removeMutation = useMutation({
    mutationFn: (rid: string) => removeRisk(id, rid),
    onSuccess: () => { toast.success('Risk removed'); queryClient.invalidateQueries({ queryKey: ['risks', id] }); queryClient.invalidateQueries({ queryKey: ['riskDashboard', id] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Remove failed'),
  });

  const openEdit = (r: any) => {
    setEditing(r);
    reset({ title: r.title ?? '', description: r.description ?? '', category: r.category ?? '', likelihood: r.likelihood ?? 'MEDIUM', impact: r.impact ?? 'MEDIUM', mitigationPlan: r.mitigationPlan ?? '' });
    setModalOpen(true);
  };

  const onSubmit = (d: any) => saveMutation.mutate({ ...d, category: d.category || null, description: d.description || null, mitigationPlan: d.mitigationPlan || null });

  const dashboard = dash ?? {};
  const dashCards = [
    { label: 'Total', value: dashboard.totalRisks ?? dashboard.total ?? risks.length },
    { label: 'Open', value: dashboard.openRisks ?? dashboard.open ?? risks.filter((r: any) => r.status === 'OPEN').length },
    { label: 'High exposure', value: dashboard.highExposure ?? risks.filter((r: any) => (r.exposureScore ?? 0) >= 9).length },
    { label: 'Overdue review', value: dashboard.overdueReviews ?? 0 },
  ];

  const columns = [
    { key: 'title', header: 'Risk', render: (r: any) => (
      <div><p className="text-slate-100">{r.title}</p>{r.category && <p className="text-xs text-slate-500">{r.category}</p>}</div>
    ) },
    { key: 'likelihood', header: 'Likelihood', render: (r: any) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${SEV_COLORS[r.likelihood] ?? 'bg-slate-100 text-slate-600'}`}>{r.likelihood ?? '—'}</span> },
    { key: 'impact', header: 'Impact', render: (r: any) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${SEV_COLORS[r.impact] ?? 'bg-slate-100 text-slate-600'}`}>{r.impact ?? '—'}</span> },
    { key: 'exposure', header: 'Exposure', render: (r: any) => (
      <span className={`font-semibold text-sm ${EXPOSURE_COLORS[r.exposureLevel ?? (r.exposureScore >= 9 ? 'HIGH' : r.exposureScore >= 4 ? 'MEDIUM' : 'LOW')] ?? 'text-slate-400'}`}>
        {r.exposureScore ?? '—'}{r.exposureLevel ? ` (${r.exposureLevel})` : ''}
      </span>
    ) },
    { key: 'status', header: 'Status', render: (r: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'OPEN' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{r.status ?? '—'}</span>
    ) },
    { key: 'owner', header: 'Owner', render: (r: any) => r.owner ? <span className="text-sm text-slate-300">{r.owner.name ?? r.owner.username ?? r.owner.email}</span> : <span className="text-sm text-slate-600">—</span> },
    { key: 'actions', header: '', render: (r: any) => (
      <div className="flex items-center gap-2">
        {r.status === 'OPEN' && (
          <button className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-green-300" title="Close risk" onClick={() => { if (confirm('Close this risk?')) closeMutation.mutate(r.id); }}><XCircle className="w-4 h-4" /></button>
        )}
        <button className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white" title="Edit" onClick={() => openEdit(r)}>✎</button>
        <button className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-rose-300" title="Delete" onClick={() => { if (confirm('Delete risk?')) removeMutation.mutate(r.id); }}><XCircle className="w-4 h-4 rotate-45" /></button>
      </div>
    ) },
  ];

  const aiNotConfigured = (envelope: any) => envelope?.status === 'NOT_CONFIGURED' || envelope?.statusCode === 'NOT_CONFIGURED';

  return (
    <div className="space-y-6">
      <Link to={`/projects/${id}`} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back to {project?.name ?? 'project'}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Risks</h1>
          <p className="mt-2 text-sm text-slate-400">Exposure = likelihood × impact (1–25), clamped on update.</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); reset({ likelihood: 'MEDIUM', impact: 'MEDIUM' }); setModalOpen(true); }}><Plus className="w-4 h-4 mr-2" /> New Risk</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {dashCards.map(c => (
          <div key={c.label} className="rounded-3xl border border-white/10 bg-slate-950/75 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{c.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[aiRisk, aiDelay].map((env, i) => env && (
          <div key={i} className={`rounded-3xl border p-4 ${aiNotConfigured(env) ? 'border-white/10 bg-slate-950/75' : 'border-violet-500/30 bg-violet-500/5'}`}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-300" />
              <p className="text-sm font-medium text-slate-200">{i === 0 ? 'Risk prediction (AI)' : 'Delay prediction (AI)'}</p>
            </div>
            {aiNotConfigured(env) ? (
              <p className="mt-2 text-sm text-slate-500">{env?.message ?? env?.reason ?? 'AI provider not configured — prediction skipped.'}</p>
            ) : (
              <p className="mt-2 text-sm text-slate-300">{env?.data ? JSON.stringify(env.data).slice(0, 200) : env?.message ?? '—'}</p>
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="px-6 py-4"><h2 className="font-semibold text-white">Risk register</h2></CardHeader>
        <CardContent>
          <DataTable columns={columns} data={risks} loading={!data} />
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); reset(); }} title={editing ? 'Edit Risk' : 'New Risk'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input {...register('title')} className={`input-field ${errors.title ? 'border-red-400' : ''}`} placeholder="What could go wrong?" />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message?.toString()}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...register('description')} className="input-field" rows={3} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Likelihood</label>
              <select {...register('likelihood')} className="input-field">{[['LOW'], ['MEDIUM'], ['HIGH']].map(([v]) => <option key={v} value={v}>{v}</option>)}</select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Impact</label>
              <select {...register('impact')} className="input-field">{[['LOW'], ['MEDIUM'], ['HIGH']].map(([v]) => <option key={v} value={v}>{v}</option>)}</select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input {...register('category')} className="input-field" placeholder="e.g. SUPPLY" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mitigation plan</label>
            <textarea {...register('mitigationPlan')} className="input-field" rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setModalOpen(false); setEditing(null); reset(); }} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
