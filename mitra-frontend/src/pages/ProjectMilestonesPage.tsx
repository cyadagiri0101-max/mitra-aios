import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { listMilestones, completeMilestone, approveMilestone, updateMilestone, removeMilestone, getProject } from '../utils/projectApi';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { ArrowLeft, CheckCircle2, ShieldCheck, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  BLOCKED: 'bg-rose-100 text-rose-800',
};

export function ProjectMilestonesPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();

  const { data } = useQuery({ queryKey: ['milestones', id], queryFn: () => listMilestones(id).then(r => r.data) });
  const { data: projectData } = useQuery({ queryKey: ['project', id], queryFn: () => getProject(id).then(r => r.data) });

  const milestones = data?.data ?? data ?? [];
  const project = projectData?.data ?? projectData;

  const completeMutation = useMutation({
    mutationFn: ({ mid, actualDate, remarks }: any) => completeMilestone(id, mid, { actualDate, remarks }),
    onSuccess: () => { toast.success('Milestone marked complete'); queryClient.invalidateQueries({ queryKey: ['milestones', id] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to complete milestone'),
  });

  const approveMutation = useMutation({
    mutationFn: (mid: string) => approveMilestone(id, mid),
    onSuccess: () => { toast.success('Milestone approved'); queryClient.invalidateQueries({ queryKey: ['milestones', id] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to approve milestone'),
  });

  const removeMutation = useMutation({
    mutationFn: (mid: string) => removeMilestone(id, mid),
    onSuccess: () => { toast.success('Milestone removed'); queryClient.invalidateQueries({ queryKey: ['milestones', id] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to remove milestone'),
  });

  const setDueDate = (mid: string, current: string | null) => {
    const next = prompt('Set planned date (YYYY-MM-DD):', (current ?? '').slice(0, 10) || undefined);
    if (next) updateMilestone(id, mid, { plannedDate: next })
      .then(() => { toast.success('Date updated'); queryClient.invalidateQueries({ queryKey: ['milestones', id] }); })
      .catch((e: any) => toast.error(e?.response?.data?.message || 'Update failed'));
  };

  const columns = [
    {
      key: 'sequenceNumber', header: '#',
      render: (m: any) => (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold bg-slate-800 text-slate-200">{m.sequenceNumber ?? '—'}</span>
      ),
    },
    {
      key: 'name', header: 'Milestone',
      render: (m: any) => (
        <div>
          <p className="text-slate-100">{m.name}</p>
          {m.description && <p className="text-xs text-slate-500">{m.description}</p>}
          {m.isBlocked && <p className="text-xs text-rose-400 mt-0.5">Blocked by {m.dependsOnMilestoneName ?? 'predecessor'}</p>}
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (m: any) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[m.status] ?? 'bg-gray-100 text-gray-800'}`}>{m.status ?? '—'}</span>
      ),
    },
    {
      key: 'plannedDate', header: 'Planned',
      render: (m: any) => (
        <button onClick={() => setDueDate(m.id, m.plannedDate)} className="text-sm text-slate-200 hover:text-sky-300 underline decoration-dotted">
          {m.plannedDate ? new Date(m.plannedDate).toLocaleDateString() : 'Set date'}
        </button>
      ),
    },
    {
      key: 'actualDate', header: 'Actual',
      render: (m: any) => m.actualDate ? <span className="text-sm text-slate-300">{new Date(m.actualDate).toLocaleDateString()}</span> : <span className="text-sm text-slate-600">—</span>,
    },
    {
      key: 'delayDays', header: 'Delay',
      render: (m: any) => {
        if (m.delayDays > 0) return <span className="text-sm font-medium text-rose-400">{m.delayDays}d</span>;
        if (m.status === 'COMPLETED' && m.delayDays <= 0) return <span className="text-sm text-green-400">on time</span>;
        return <span className="text-sm text-slate-600">—</span>;
      },
    },
    {
      key: 'actions', header: 'Actions',
      render: (m: any) => (
        <div className="flex items-center gap-2">
          {m.status !== 'COMPLETED' && m.status !== 'APPROVED' && (
            <button
              className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-green-300"
              title="Mark complete"
              onClick={() => {
                const actual = prompt('Actual date (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
                if (actual) completeMutation.mutate({ mid: m.id, actualDate: actual, remarks: prompt('Remarks (optional):') ?? undefined });
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          {m.status === 'COMPLETED' && (
            <button className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-emerald-300" title="Approve" onClick={() => approveMutation.mutate(m.id)}>
              <ShieldCheck className="w-4 h-4" />
            </button>
          )}
          <button className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-rose-300" title="Delete" onClick={() => { if (confirm('Delete this milestone?')) removeMutation.mutate(m.id); }}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const done = milestones.filter((m: any) => m.status === 'COMPLETED' || m.status === 'APPROVED').length;
  const progress = milestones.length ? Math.round((done / milestones.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <Link to={`/projects/${id}`} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back to {project?.name ?? 'project'}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Milestones</h1>
          <p className="mt-2 text-sm text-slate-400">{done} of {milestones.length} completed · planned from the DEFAULT_MOLD template at project creation.</p>
        </div>
        <div className="w-full sm:w-64">
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-right text-xs text-slate-400">{progress}%</p>
        </div>
      </div>

      <Card>
        <CardHeader className="px-6 py-4"><h2 className="font-semibold text-white">Milestone list</h2></CardHeader>
        <CardContent>
          <DataTable columns={columns} data={milestones} loading={!data} />
        </CardContent>
      </Card>
    </div>
  );
}
