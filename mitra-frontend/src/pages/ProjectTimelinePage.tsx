import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getTimeline, getProject } from '../utils/projectApi';
import { api } from '../utils/api';
import { ArrowLeft, CheckCircle2, AlertTriangle, Sparkles, Check, X, ShieldAlert } from 'lucide-react';

export function ProjectTimelinePage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [confirmApplyId, setConfirmApplyId] = useState<string | null>(null);

  const { data } = useQuery({ queryKey: ['timeline', id], queryFn: () => getTimeline(id, { includeTasks: true, includeMilestones: true }).then((r: any) => r.data) });
  const { data: projectData } = useQuery({ queryKey: ['project', id], queryFn: () => getProject(id).then((r: any) => r.data) });

  // G14 AI Timeline Risk Query
  const { data: riskData } = useQuery({
    queryKey: ['project-timeline-risk', id],
    queryFn: () => api.get(`/api/predictive/leveling/projects/${id}/risk`).then((r: any) => r.data).catch(() => null),
    enabled: Boolean(id),
  });

  // G14 Recommendations Query
  const { data: recsData } = useQuery({
    queryKey: ['project-leveling-recs', id],
    queryFn: () => api.get('/api/predictive/leveling/recommendations', { params: { projectId: id } }).then((r: any) => r.data).catch(() => []),
    enabled: Boolean(id),
  });

  // Leveling Mutation
  const generateRecMutation = useMutation({
    mutationFn: () => api.post('/api/predictive/leveling/recommendations/generate', { projectId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-leveling-recs', id] });
      queryClient.invalidateQueries({ queryKey: ['project-timeline-risk', id] });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (recId: string) => api.post(`/api/predictive/leveling/recommendations/${recId}/accept`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-leveling-recs', id] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (recId: string) => api.post(`/api/predictive/leveling/recommendations/${recId}/reject`, { rejectionReason: 'Planner rejected proposal' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-leveling-recs', id] }),
  });

  const applyMutation = useMutation({
    mutationFn: (recId: string) => api.post(`/api/predictive/leveling/recommendations/${recId}/apply`, { confirmExecution: true }),
    onSuccess: () => {
      setConfirmApplyId(null);
      queryClient.invalidateQueries({ queryKey: ['project-leveling-recs', id] });
      queryClient.invalidateQueries({ queryKey: ['timeline', id] });
    },
  });

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

  const risk = riskData?.data ?? riskData;
  const recommendations = Array.isArray(recsData?.data) ? recsData.data : (Array.isArray(recsData) ? recsData : []);

  return (
    <div className="space-y-6">
      <Link to={`/projects/${id}`} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back to {project?.name ?? 'project'}
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Timeline & Critical Path</h1>
          <p className="mt-2 text-sm text-slate-400">
            {summary.totalDurationDays != null ? `${summary.totalDurationDays} days total` : 'Gantt view'} ·{' '}
            {criticalPath.length > 0 ? `${criticalPath.length} critical items` : 'no critical items'}
          </p>
        </div>
        <button
          onClick={() => generateRecMutation.mutate()}
          disabled={generateRecMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 hover:bg-indigo-600/50 text-sm font-medium transition-colors"
        >
          <Sparkles className="w-4 h-4 text-indigo-400" />
          {generateRecMutation.isPending ? 'Analyzing Timeline...' : 'Analyze & Generate Leveling Advice'}
        </button>
      </div>

      {/* G14 AI Timeline Risk Panel */}
      {risk && (
        <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                risk.riskTier === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                risk.riskTier === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                risk.riskTier === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                Risk: {risk.riskTier}
              </span>
              <span className="text-xs text-slate-400">Model: {risk.modelVersion}</span>
            </div>
            <span className="text-xs text-indigo-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> G14 Predictive Advisory
            </span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Forecasted Delay</p>
              <p className="mt-1 text-2xl font-bold text-white">{Number(risk.predictedDelayDays || 0).toFixed(1)} <span className="text-sm font-normal text-slate-400">days</span></p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Delay Probability</p>
              <p className="mt-1 text-2xl font-bold text-white">{(Number(risk.delayProbability || 0) * 100).toFixed(0)}%</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Prediction Interval</p>
              <p className="mt-1 text-lg font-bold text-slate-200">[{Number(risk.predictionInterval?.lower || 0).toFixed(1)}d, {Number(risk.predictionInterval?.upper || 0).toFixed(1)}d]</p>
            </div>
          </div>

          {risk.contributingSignals?.length > 0 && (
            <div className="mt-3 text-xs text-slate-400 flex flex-wrap gap-2">
              <span className="text-slate-300 font-medium">Contributing Signals:</span>
              {risk.contributingSignals.map((sig: string, idx: number) => (
                <span key={idx} className="px-2 py-0.5 rounded bg-slate-800/80 border border-white/10 text-slate-300">{sig}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* G14 Advisory Recommendations Panel */}
      {recommendations.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Advisory Leveling Proposals ({recommendations.length})
            </h2>
            <span className="text-xs text-slate-400">Human Approval Required</span>
          </div>

          <div className="space-y-3">
            {recommendations.map((rec: any) => (
              <div key={rec.id} className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {rec.recommendationType}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300">
                      Status: {rec.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white">{rec.expectedBenefit}</p>
                  <p className="text-xs text-slate-400">{rec.explanation?.rationale}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {rec.status === 'GENERATED' || rec.status === 'UNDER_REVIEW' ? (
                    <>
                      <button
                        onClick={() => acceptMutation.mutate(rec.id)}
                        className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 text-xs font-medium inline-flex items-center gap-1"
                        title="Accept Proposal"
                      >
                        <Check className="w-4 h-4" /> Accept
                      </button>
                      <button
                        onClick={() => rejectMutation.mutate(rec.id)}
                        className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30 text-xs font-medium inline-flex items-center gap-1"
                        title="Reject Proposal"
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </>
                  ) : null}

                  {rec.status === 'ACCEPTED' || rec.status === 'MODIFIED' ? (
                    <button
                      onClick={() => setConfirmApplyId(rec.id)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 inline-flex items-center gap-1.5"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" /> Apply Change
                    </button>
                  ) : null}

                  {rec.status === 'APPLIED' && (
                    <span className="text-xs text-emerald-400 font-medium inline-flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Applied
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explicit Apply Confirmation Modal */}
      {confirmApplyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-white/15 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-white">Confirm Schedule Mutation</h3>
            </div>
            <p className="text-sm text-slate-300">
              This action will update planned milestone/work-order dates on the authoritative timeline.
              Are you sure you want to apply this advisory change?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmApplyId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => applyMutation.mutate(confirmApplyId)}
                disabled={applyMutation.isPending}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30"
              >
                {applyMutation.isPending ? 'Applying...' : 'Confirm & Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Gantt / Timeline Grid */}
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
