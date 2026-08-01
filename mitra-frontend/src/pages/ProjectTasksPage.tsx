import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { listTasks, createTask, updateTask, changeTaskStatus, removeTask, addTaskDependency, removeTaskDependency, listMilestones, getProject } from '../utils/projectApi';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { ArrowLeft, Plus, Link2, Unlink, Trash2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const taskSchema = z.object({
  title: z.string().min(2, 'Title is required').max(200),
  description: z.string().optional().or(z.literal('')),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  assigneeId: z.string().optional().or(z.literal('')),
  milestoneId: z.string().optional().or(z.literal('')),
  startDate: z.string().optional().or(z.literal('')),
  dueDate: z.string().optional().or(z.literal('')),
  estimatedHours: z.string().optional().or(z.literal('')),
  progress: z.string().optional().or(z.literal('')),
});

type TaskForm = z.infer<typeof taskSchema>;

const STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-slate-200 text-slate-700', IN_PROGRESS: 'bg-blue-100 text-blue-800',
  IN_REVIEW: 'bg-amber-100 text-amber-800', DONE: 'bg-green-100 text-green-800',
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600', MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800', URGENT: 'bg-rose-100 text-rose-800',
};

export function ProjectTasksPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [depMenu, setDepMenu] = useState<string | null>(null);
  const [depTarget, setDepTarget] = useState<string>('');

  const { data } = useQuery({ queryKey: ['tasks', id], queryFn: () => listTasks(id).then(r => r.data) });
  const { data: milestonesData } = useQuery({ queryKey: ['milestones', id], queryFn: () => listMilestones(id).then(r => r.data), enabled: !!id });
  const { data: projectData } = useQuery({ queryKey: ['project', id], queryFn: () => getProject(id).then(r => r.data) });

  const tasks = data?.data ?? data ?? [];
  const milestones = milestonesData?.data ?? milestonesData ?? [];
  const project = projectData?.data ?? projectData;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TaskForm>({ resolver: zodResolver(taskSchema) });

  const saveMutation = useMutation({
    mutationFn: (payload: any) => editing ? updateTask(id, editing.id, payload) : createTask(id, payload),
    onSuccess: () => {
      toast.success(editing ? 'Task updated' : 'Task created');
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
      setIsModalOpen(false); setEditing(null); reset();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Save failed'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ tid, status }: any) => changeTaskStatus(id, tid, status),
    onSuccess: () => { toast.success('Status changed'); queryClient.invalidateQueries({ queryKey: ['tasks', id] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Status change failed'),
  });

  const removeMutation = useMutation({
    mutationFn: (tid: string) => removeTask(id, tid),
    onSuccess: () => { toast.success('Task removed'); queryClient.invalidateQueries({ queryKey: ['tasks', id] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Remove failed'),
  });

  const depMutation = useMutation({
    mutationFn: ({ tid, dependsOnTaskId }: any) => addTaskDependency(id, tid, dependsOnTaskId),
    onSuccess: () => { toast.success('Dependency added'); queryClient.invalidateQueries({ queryKey: ['tasks', id] }); setDepMenu(null); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Dependency failed'),
  });

  const unlinkMutation = useMutation({
    mutationFn: ({ tid, dependsOnTaskId }: any) => removeTaskDependency(id, tid, dependsOnTaskId),
    onSuccess: () => { toast.success('Dependency removed'); queryClient.invalidateQueries({ queryKey: ['tasks', id] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Unlink failed'),
  });

  const openCreate = () => { setEditing(null); reset({ priority: 'MEDIUM' }); setIsModalOpen(true); };
  const openEdit = (t: any) => {
    setEditing(t);
    reset({
      title: t.title ?? '', description: t.description ?? '', priority: t.priority ?? 'MEDIUM',
      assigneeId: t.assigneeId ?? '', milestoneId: t.milestoneId ?? '',
      startDate: t.startDate?.slice(0, 10) ?? '', dueDate: t.dueDate?.slice(0, 10) ?? '',
      estimatedHours: t.estimatedHours != null ? String(t.estimatedHours) : '',
      progress: t.progress != null ? String(t.progress) : '',
    });
    setIsModalOpen(true);
  };

  const onSubmit = (form: TaskForm) => {
    saveMutation.mutate({
      ...form,
      assigneeId: form.assigneeId || null, milestoneId: form.milestoneId || null,
      startDate: form.startDate || null, dueDate: form.dueDate || null,
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : null,
      progress: form.progress ? Number(form.progress) : null,
    });
  };

  const columns = [
    {
      key: 'title', header: 'Task',
      render: (t: any) => (
        <div>
          <p className="text-slate-100">{t.title}</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_COLORS[t.priority] ?? 'bg-slate-100 text-slate-600'}`}>{t.priority ?? '—'}</span>
            {t.progress != null && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">{t.progress}%</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'milestone', header: 'Milestone',
      render: (t: any) => t.milestone?.name ? <span className="text-sm text-slate-300">{t.milestone.name}</span> : <span className="text-sm text-slate-600">—</span>,
    },
    {
      key: 'assignee', header: 'Assignee',
      render: (t: any) => t.assignee ? <span className="text-sm text-slate-300">{t.assignee.name ?? t.assignee.username ?? t.assignee.email}</span> : <span className="text-sm text-slate-600">—</span>,
    },
    {
      key: 'dueDate', header: 'Due',
      render: (t: any) => t.dueDate ? <span className="text-sm text-slate-300">{new Date(t.dueDate).toLocaleDateString()}</span> : <span className="text-sm text-slate-600">—</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (t: any) => (
        <div className="relative">
          <button className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border border-white/10" onClick={() => setDepMenu(depMenu === t.id ? null : t.id)}>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[t.status] ?? 'bg-slate-200 text-slate-700'}`}>{t.status ?? 'TODO'}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {depMenu === t.id && (
            <div className="absolute z-20 mt-1 w-40 rounded-xl border border-white/10 bg-slate-900 shadow-xl py-1">
              {STATUSES.map(s => (
                <button key={s} onClick={() => { statusMutation.mutate({ tid: t.id, status: s }); setDepMenu(null); }} className="block w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">{s}</button>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'deps', header: 'Depends on',
      render: (t: any) => {
        const deps = t.dependsOnTasks ?? t.dependencies ?? [];
        return (
          <div className="flex flex-wrap gap-1">
            {deps.length === 0 && <span className="text-xs text-slate-600">—</span>}
            {deps.map((d: any) => (
              <span key={d.id ?? d.dependsOnTaskId} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                {(d.dependsOnTask?.title ?? d.title ?? 'task').slice(0, 18)}
                <button onClick={() => unlinkMutation.mutate({ tid: t.id, dependsOnTaskId: d.dependsOnTaskId ?? d.id })}><Unlink className="w-3 h-3 hover:text-rose-400" /></button>
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'actions', header: '',
      render: (t: any) => (
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-sky-300" title="Link dependency" onClick={() => { setDepTarget(t.id); setDepMenu('__add__'); }}>
            <Link2 className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white" title="Edit" onClick={() => openEdit(t)}>✎</button>
          <button className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-rose-300" title="Delete" onClick={() => { if (confirm('Delete task?')) removeMutation.mutate(t.id); }}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const pendingDeps = depMenu === '__add__' ? depTarget : null;

  return (
    <div className="space-y-6">
      <Link to={`/projects/${id}`} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back to {project?.name ?? 'project'}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="mt-2 text-sm text-slate-400">{tasks.length} tasks · DONE status is gated by open dependencies.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> New Task</button>
      </div>

      {pendingDeps && (
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-300">Link task dependency:</span>
            <select className="input-field bg-slate-950/70 border-white/10 text-slate-100 text-sm flex-1 min-w-52" value="" onChange={e => { if (e.target.value) depMutation.mutate({ tid: pendingDeps, dependsOnTaskId: e.target.value }); setDepMenu(null); }}>
              <option value="" disabled>Select predecessor task…</option>
              {tasks.filter((t: any) => t.id !== pendingDeps).map((t: any) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            <button className="btn-secondary" onClick={() => setDepMenu(null)}>Cancel</button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="px-6 py-4"><h2 className="font-semibold text-white">Task list</h2></CardHeader>
        <CardContent>
          <DataTable columns={columns} data={tasks} loading={!data} />
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditing(null); reset(); }} title={editing ? 'Edit Task' : 'New Task'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input {...register('title')} className={`input-field ${errors.title ? 'border-red-400' : ''}`} placeholder="Task title" />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message?.toString()}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...register('description')} className="input-field" rows={3} placeholder="Details…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select {...register('priority')} className="input-field">{[['LOW'], ['MEDIUM'], ['HIGH'], ['URGENT']].map(([v]) => <option key={v} value={v}>{v}</option>)}</select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Milestone</label>
              <select {...register('milestoneId')} className="input-field"><option value="">None</option>{milestones.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
              <input type="date" {...register('startDate')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
              <input type="date" {...register('dueDate')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Est. hours</label>
              <input type="number" min="0" step="0.5" {...register('estimatedHours')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Progress %</label>
              <input type="number" min="0" max="100" {...register('progress')} className="input-field" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setIsModalOpen(false); setEditing(null); reset(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary disabled:opacity-50">{saveMutation.isPending ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
