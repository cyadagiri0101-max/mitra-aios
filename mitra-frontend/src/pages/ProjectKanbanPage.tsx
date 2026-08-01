import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { listTasks, changeTaskStatus, getProject } from '../utils/projectApi';
import { ArrowLeft, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const COLUMNS = [
  { status: 'TODO', label: 'To Do', accent: 'border-t-slate-500' },
  { status: 'IN_PROGRESS', label: 'In Progress', accent: 'border-t-blue-500' },
  { status: 'IN_REVIEW', label: 'In Review', accent: 'border-t-amber-500' },
  { status: 'DONE', label: 'Done', accent: 'border-t-green-500' },
];

const PRIORITY_DOT: Record<string, string> = {
  LOW: 'bg-slate-400', MEDIUM: 'bg-blue-400', HIGH: 'bg-orange-400', URGENT: 'bg-rose-400',
};

export function ProjectKanbanPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();

  const { data } = useQuery({ queryKey: ['tasks', id], queryFn: () => listTasks(id, { limit: 200 }).then(r => r.data) });
  const { data: projectData } = useQuery({ queryKey: ['project', id], queryFn: () => getProject(id).then(r => r.data) });

  const tasks = data?.data ?? data ?? [];
  const project = projectData?.data ?? projectData;

  const moveMutation = useMutation({
    mutationFn: ({ tid, status }: any) => changeTaskStatus(id, tid, status),
    onSuccess: () => { toast.success('Task moved'); queryClient.invalidateQueries({ queryKey: ['tasks', id] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Move failed'),
  });

  return (
    <div className="space-y-6">
      <Link to={`/projects/${id}`} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back to {project?.name ?? 'project'}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">Kanban Board</h1>
        <p className="mt-2 text-sm text-slate-400">Drag-free board — use the arrow buttons to move tasks between states.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter((t: any) => t.status === col.status);
          return (
            <div key={col.status} className={`rounded-3xl border border-white/10 border-t-4 ${col.accent} bg-slate-950/60 p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-white">{col.label}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{colTasks.length}</span>
              </div>
              <div className="space-y-3">
                {colTasks.length === 0 && <p className="text-sm text-slate-600">Nothing here.</p>}
                {colTasks.map((t: any) => (
                  <div key={t.id} className="rounded-2xl border border-white/10 bg-slate-900/80 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-slate-100 leading-snug">{t.title}</p>
                      <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[t.priority] ?? 'bg-slate-400'}`} title={t.priority ?? '—'} />
                    </div>
                    {t.milestone?.name && <p className="mt-1 text-xs text-slate-500">📌 {t.milestone.name}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-500">{t.assignee?.name ?? t.assignee?.username ?? 'Unassigned'}</span>
                      <div className="flex gap-1">
                        {col.status !== 'TODO' && (
                          <button className="p-1 rounded-md border border-white/10 text-xs text-slate-300 hover:text-sky-300" onClick={() => moveMutation.mutate({ tid: t.id, status: COLUMNS[COLUMNS.findIndex(c => c.status === col.status) - 1].status })}>◀</button>
                        )}
                        {col.status !== 'DONE' && (
                          <button className="p-1 rounded-md border border-white/10 text-xs text-slate-300 hover:text-sky-300" onClick={() => moveMutation.mutate({ tid: t.id, status: COLUMNS[COLUMNS.findIndex(c => c.status === col.status) + 1].status })}>▶</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Link to={`/projects/${id}/tasks`} className="inline-flex items-center gap-2 text-sm text-sky-300 hover:text-sky-200">
        <Plus className="w-4 h-4" /> Add tasks from the task list
      </Link>
    </div>
  );
}
