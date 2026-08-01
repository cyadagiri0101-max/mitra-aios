import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getTimeline, getProject } from '../utils/projectApi';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export function ProjectTimelinePage() {
  const { id = '' } = useParams();

  const { data } = useQuery({ queryKey: ['timeline', id], queryFn: () => getTimeline(id, { includeTasks: true, includeMilestones: true }).then(r => r.data) });
  const { data: projectData } = useQuery({ queryKey: ['project', id], queryFn: () => getProject(id).then(r => r.data) });

  const timeline = data?.data ?? data;
  const project = projectData?.data ?? projectData;
  const rows = timeline?.rows ?? timeline?.ganttRows ?? [];
  const links = timeline?.links ?? timeline?.dependencies ?? [];
  const summary = timeline?.summary ?? {};
  const criticalPath = timeline?.criticalPath ?? timeline?.criticalPathIds ?? [];

  const minDate = rows.length ? new Date(Math.min(...rows.map((r: any) => new Date(r.startDate).getTime()))) : new Date();
  const maxDate = rows.length ? new Date(Math.max(...rows.map((r: any) => new Date(r.endDate).getTime()))) : new Date();
  const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000));

  const leftDays = (d: string) => Math.max(0, Math.ceil((new Date(d).getTime() - minDate.getTime()) / 86400000));

  return (
    <div className="space-y-6">
      <Link to={`/projects/${id}`} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back to {project?.name ?? 'project'}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">Timeline & Critical Path</h1>
        <p className="mt-2 text-sm text-slate-400">
          {summary.totalDurationDays != null ? `${summary.totalDurationDays} days total` : 'Gantt view'} ·{' '}
          {criticalPath.length > 0 ? `${criticalPath.length} critical items` : 'no critical items'}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total duration</p>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.totalDurationDays ?? totalDays} days</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Critical path</p>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.criticalPathDurationDays ?? 0} days</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Items</p>
          <p className="mt-3 text-3xl font-semibold text-white">{rows.length}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-6 overflow-x-auto">
        <div className="min-w-[640px] space-y-2">
          {rows.length === 0 && <p className="text-sm text-slate-500">No dated items yet — set start/due dates on tasks and milestones.</p>}
          {rows.map((r: any, i: number) => {
            const s = new Date(r.startDate).getTime();
            const e = new Date(r.endDate).getTime();
            const isCritical = criticalPath.includes(r.id) || r.isCritical;
            const left = leftDays(r.startDate);
            const widthPct = Math.max(2, Math.min(100, ((e - s) / 86400000 / totalDays) * 100));
            return (
              <div key={r.id ?? i} className="flex items-center gap-3">
                <div className="w-44 shrink-0 flex items-center gap-2">
                  {r.status === 'COMPLETED' || r.status === 'APPROVED'
                    ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    : <span className="w-4 h-4 shrink-0" />}
                  <span className="text-xs text-slate-300 truncate">{r.name ?? r.title ?? r.milestoneName}</span>
                </div>
                <div className="relative flex-1 h-6 bg-slate-900 rounded-md overflow-hidden">
                  <div
                    className={`absolute top-0 bottom-0 rounded-md border ${isCritical ? 'bg-rose-500/70 border-rose-300' : 'bg-sky-500/60 border-sky-300/50'}`}
                    style={{ left: `${left / totalDays * 100}%`, width: `${widthPct}%` }}
                    title={`${r.name ?? r.title}: ${new Date(r.startDate).toLocaleDateString()} → ${new Date(r.endDate).toLocaleDateString()}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {links.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-6">
          <h2 className="font-semibold text-white mb-3">Task dependencies</h2>
          <div className="flex flex-wrap gap-2">
            {links.map((l: any, i: number) => (
              <span key={i} className="px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs text-slate-300">
                {(l.fromTitle ?? l.title ?? 'task').slice(0, 20)} → {(l.toTitle ?? 'next').slice(0, 20)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
