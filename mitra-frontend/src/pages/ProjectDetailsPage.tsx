import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  getProject, listMilestones, listTasks, getRiskDashboard, getTimeline,
  executeWorkflowTransition, listTeams, listProjectDocuments, getProjectActivity, getTeamAvailability,
} from '../utils/projectApi';
import { Card, CardContent, CardHeader } from '../components/Card';
import { ArrowLeft, GitBranch, ClipboardList, Clock, AlertTriangle, Users, FileText, ChevronRight, ArrowRight, Network } from 'lucide-react';
import toast from 'react-hot-toast';

const STAGE_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800', KICKOFF: 'bg-sky-100 text-sky-800',
  DESIGN: 'bg-indigo-100 text-indigo-800', PLANNING: 'bg-cyan-100 text-cyan-800',
  EXECUTION: 'bg-blue-100 text-blue-800', MONITORING: 'bg-violet-100 text-violet-800',
  CLOSING: 'bg-amber-100 text-amber-800', COMPLETED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-slate-200 text-slate-700',
  ENQUIRY: 'bg-gray-100 text-gray-800', QUOTATION: 'bg-blue-100 text-blue-800',
  APPROVAL: 'bg-yellow-100 text-yellow-800', PROJECT_CREATED: 'bg-purple-100 text-purple-800',
  DESIGN_INITIATED: 'bg-indigo-100 text-indigo-800', MANUFACTURING: 'bg-orange-100 text-orange-800',
  INTERNAL_TRIAL: 'bg-pink-100 text-pink-800', CUSTOMER_TRIAL: 'bg-rose-100 text-rose-800',
  CAPA: 'bg-red-100 text-red-800', DISPATCH: 'bg-teal-100 text-teal-800', SERVICE: 'bg-green-100 text-green-800',
};

const HEALTH_COLORS: Record<string, string> = {
  GREEN: 'bg-green-100 text-green-800', YELLOW: 'bg-yellow-100 text-yellow-800', RED: 'bg-red-100 text-red-800',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800', ACTIVE: 'bg-blue-100 text-blue-800',
  ON_HOLD: 'bg-slate-100 text-slate-700', COMPLETED: 'bg-green-100 text-green-800', CANCELLED: 'bg-rose-100 text-rose-800',
};

export function ProjectDetailsPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [transitionId, setTransitionId] = useState<string | null>(null);

  const { data: projectData, isLoading } = useQuery({ queryKey: ['project', id], queryFn: () => getProject(id).then(r => r.data) });
  const { data: milestonesData } = useQuery({ queryKey: ['milestones', id], queryFn: () => listMilestones(id).then(r => r.data), enabled: !!id });
  const { data: tasksData } = useQuery({ queryKey: ['tasks', id], queryFn: () => listTasks(id).then(r => r.data), enabled: !!id });
  const { data: risksData } = useQuery({ queryKey: ['risks', id], queryFn: () => getRiskDashboard(id).then(r => r.data), enabled: !!id });
  const { data: timelineData } = useQuery({ queryKey: ['timeline', id], queryFn: () => getTimeline(id).then(r => r.data), enabled: !!id });
  const { data: teamsData } = useQuery({ queryKey: ['teams', id], queryFn: () => listTeams(id).then(r => r.data), enabled: !!id });
  const { data: docsData } = useQuery({ queryKey: ['documents', id], queryFn: () => listProjectDocuments(id).then(r => r.data), enabled: !!id });
  const { data: activityData } = useQuery({ queryKey: ['activity', id], queryFn: () => getProjectActivity(id).then(r => r.data), enabled: !!id });
  const { data: availabilityData } = useQuery({ queryKey: ['availability', id], queryFn: () => getTeamAvailability(id).then(r => r.data), enabled: !!id });

  const transitionMutation = useMutation({
    mutationFn: () => executeWorkflowTransition(id, transitionId!),
    onSuccess: () => {
      toast.success('Transition executed');
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setTransitionId(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Transition failed'),
  });

  const project = projectData?.data ?? projectData;
  const milestones = milestonesData?.data ?? milestonesData ?? [];
  const tasks = tasksData?.data ?? tasksData ?? [];
  const teams = teamsData?.data ?? teamsData ?? [];
  const docs = docsData?.data ?? docsData ?? [];
  const activity = activityData?.data ?? activityData ?? [];

  const doneMilestones = milestones.filter((m: any) => m.status === 'COMPLETED').length;
  const activeTasks = tasks.filter((t: any) => t.status !== 'DONE').length;
  const riskRows = Array.isArray(risksData) ? risksData : risksData?.data ?? [];
  const openRisks = riskRows.filter((r: any) => r.status === 'OPEN').length;
  const timeline = timelineData?.data ?? timelineData;
  const availability = Array.isArray(availabilityData) ? availabilityData : availabilityData?.data ?? [];

  const transitions = project?.availableTransitions ?? project?.nextTransitions ?? [];

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back to projects
      </Link>

      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-slate-400">Loading project…</CardContent></Card>
      ) : !project ? (
        <Card><CardContent className="py-12 text-center text-rose-300">Project not found.</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STAGE_COLORS[project.stage] ?? STAGE_COLORS[project.workflowState?.stateCode] ?? 'bg-gray-100 text-gray-800'}`}>
                      {(project.stage ?? project.workflowState?.stateCode ?? '—').replace(/_/g, ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-800'}`}>{project.status ?? '—'}</span>
                    {project.healthStatus && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${HEALTH_COLORS[project.healthStatus] ?? 'bg-green-100 text-green-800'}`}>Health: {project.healthStatus}</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{project.projectNumber ?? project.project_number}</p>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Customer</p><p className="mt-1 text-slate-100">{project.customerName ?? project.customer_name ?? '—'}</p></div>
                    <div><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Product</p><p className="mt-1 text-slate-100">{project.productName ?? project.product_name ?? '—'}</p></div>
                    <div><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Target delivery</p><p className="mt-1 text-slate-100">{project.targetDeliveryDate ?? project.plannedEndDate ? new Date(project.targetDeliveryDate ?? project.plannedEndDate).toLocaleDateString() : '—'}</p></div>
                    <div><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Progress</p><p className="mt-1 text-slate-100">{project.completionPercentage ?? project.overallProgress ?? 0}%</p></div>
                  </div>
                  {project.description && <p className="mt-4 text-sm text-slate-300">{project.description}</p>}
                </div>

                {transitions.length > 0 && (
                  <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 min-w-56">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-3">Workflow actions</p>
                    <select value={transitionId ?? ''} onChange={e => setTransitionId(e.target.value)} className="input-field bg-slate-950/70 border-white/10 text-slate-100 text-sm">
                      <option value="" disabled>Select transition…</option>
                      {transitions.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.transitionName ?? t.name ?? t.toState?.stateCode ?? '→ next'}</option>
                      ))}
                    </select>
                    <button className="btn-primary w-full mt-3 disabled:opacity-50" disabled={!transitionId || transitionMutation.isPending} onClick={() => transitionMutation.mutate()}>
                      <GitBranch className="w-4 h-4 mr-2" /> Apply
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Milestones</p>
              <p className="mt-3 text-3xl font-semibold text-white">{doneMilestones}<span className="text-lg text-slate-500">/{milestones.length}</span></p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Open tasks</p>
              <p className="mt-3 text-3xl font-semibold text-white">{activeTasks}<span className="text-lg text-slate-500">/{tasks.length}</span></p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Open risks</p>
              <p className="mt-3 text-3xl font-semibold text-white">{openRisks}<span className="text-lg text-slate-500">/{riskRows.length}</span></p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Critical path</p>
              <p className="mt-3 text-3xl font-semibold text-white">{timeline?.summary?.criticalPathDurationDays ?? timeline?.criticalPath?.length ?? 0}</p>
              {timeline?.summary?.totalDurationDays != null && <p className="mt-1 text-xs text-slate-500">of {timeline.summary.totalDurationDays} days</p>}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 grid gap-6 sm:grid-cols-2">
              <Link to={`/projects/${id}/milestones`} className="group rounded-3xl border border-white/10 bg-slate-950/75 p-5 hover:border-white/25 transition">
                <div className="flex items-center justify-between">
                  <ClipboardList className="w-5 h-5 text-sky-400" />
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
                </div>
                <p className="mt-4 font-semibold text-white">Milestones</p>
                <p className="mt-1 text-sm text-slate-400">{milestones.length} milestones · {doneMilestones} done</p>
              </Link>
              <Link to={`/projects/${id}/tasks`} className="group rounded-3xl border border-white/10 bg-slate-950/75 p-5 hover:border-white/25 transition">
                <div className="flex items-center justify-between">
                  <ArrowRight className="w-5 h-5 text-blue-400" />
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
                </div>
                <p className="mt-4 font-semibold text-white">Tasks</p>
                <p className="mt-1 text-sm text-slate-400">{tasks.length} tasks · {activeTasks} open</p>
              </Link>
              <Link to={`/projects/${id}/timeline`} className="group rounded-3xl border border-white/10 bg-slate-950/75 p-5 hover:border-white/25 transition">
                <div className="flex items-center justify-between">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
                </div>
                <p className="mt-4 font-semibold text-white">Timeline</p>
                <p className="mt-1 text-sm text-slate-400">Gantt view · critical path</p>
              </Link>
              <Link to={`/projects/${id}/risks`} className="group rounded-3xl border border-white/10 bg-slate-950/75 p-5 hover:border-white/25 transition">
                <div className="flex items-center justify-between">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
                </div>
                <p className="mt-4 font-semibold text-white">Risks</p>
                <p className="mt-1 text-sm text-slate-400">{openRisks} open · exposure tracking</p>
              </Link>
              <Link to={`/projects/${id}/teams`} className="group rounded-3xl border border-white/10 bg-slate-950/75 p-5 hover:border-white/25 transition">
                <div className="flex items-center justify-between">
                  <Users className="w-5 h-5 text-green-400" />
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
                </div>
                <p className="mt-4 font-semibold text-white">Teams</p>
                <p className="mt-1 text-sm text-slate-400">{teams.length} teams · {availability.length} availability</p>
              </Link>
              <Link to={`/projects/${id}/documents`} className="group rounded-3xl border border-white/10 bg-slate-950/75 p-5 hover:border-white/25 transition">
                <div className="flex items-center justify-between">
                  <FileText className="w-5 h-5 text-violet-400" />
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
                </div>
                <p className="mt-4 font-semibold text-white">Documents</p>
                <p className="mt-1 text-sm text-slate-400">{docs.length} documents · version control</p>
              </Link>
              <Link to={`/service/lineage/${id}`} className="group rounded-3xl border border-white/10 bg-slate-950/75 p-5 hover:border-white/25 transition">
                <div className="flex items-center justify-between">
                  <Network className="w-5 h-5 text-cyan-400" />
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
                </div>
                <p className="mt-4 font-semibold text-white">Service Digital Thread</p>
                <p className="mt-1 text-sm text-slate-400">Dispatch → Installation → Warranty → Service → Claim</p>
              </Link>
            </div>

            <Card>
              <CardHeader className="px-6 py-4"><h2 className="font-semibold text-white">Recent activity</h2></CardHeader>
              <CardContent className="px-6 pb-6 space-y-3 max-h-96 overflow-y-auto">
                {activity.length === 0 && <p className="text-sm text-slate-500">No activity yet.</p>}
                {(Array.isArray(activity) ? activity : []).map((a: any, i: number) => (
                  <div key={a.id ?? i} className="border-l-2 border-white/10 pl-3">
                    <p className="text-sm text-slate-200">{a.action?.replace(/_/g, ' ')} <span className="text-slate-500">· {a.entity ?? ''}</span></p>
                    <p className="text-xs text-slate-500">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
