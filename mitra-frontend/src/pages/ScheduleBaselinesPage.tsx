import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  History,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Layers,
  Plus,
  Play,
  Zap,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';

interface ProjectOption {
  id: string;
  name: string;
  projectCode?: string;
  status?: string;
}

interface ScheduleBaseline {
  id: string;
  baselineNumber: string;
  name: string;
  description: string | null;
  version: number;
  status: 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'CANCELLED';
  reason: string | null;
  effectiveDate: string | null;
  totalPlannedDurationDays: number;
  totalPlannedHours: number;
  isLocked: boolean;
  activatedAt: string | null;
  createdAt: string;
}

interface VarianceReport {
  projectId: string;
  baselineId: string;
  baselineNumber: string;
  baselineName: string;
  baselineVersion: number;
  baselineStatus: string;
  effectiveDate: string | null;
  overallScheduleVarianceDays: number;
  overallHoursVariance: number;
  overallVariancePct: number;
  isBehindSchedule: boolean;
  explanation: string;
  milestoneVariances: Array<{
    sourceId: string | null;
    title: string;
    baselinePlannedDate: string | null;
    currentPlannedDate: string | null;
    actualDate: string | null;
    varianceDays: number;
    status: string;
  }>;
  taskVariances: Array<{
    sourceId: string | null;
    title: string;
    stageCode: string | null;
    baselineStartDate: string | null;
    baselineFinishDate: string | null;
    currentStartDate: string | null;
    currentFinishDate: string | null;
    baselineDurationDays: number;
    currentDurationDays: number;
    durationVarianceDays: number;
    baselineHours: number;
    currentHours: number;
    hoursVariance: number;
    variancePct: number;
    status: string;
  }>;
  designStageVariances: Array<{
    stageCode: string;
    stageName: string;
    baselineDurationDays: number;
    currentPlannedDurationDays: number;
    actualDurationDays: number | null;
    durationVarianceDays: number;
    baselineHours: number;
    currentPlannedHours: number;
    actualHours: number | null;
    hoursVariance: number;
    status: string;
  }>;
}

export const ScheduleBaselinesPage: React.FC = () => {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [baselines, setBaselines] = useState<ScheduleBaseline[]>([]);
  const [selectedBaselineId, setSelectedBaselineId] = useState<string>('');
  const [variance, setVariance] = useState<VarianceReport | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formEffectiveDate, setFormEffectiveDate] = useState(
    new Date().toISOString().split('T')[0],
  );

  const token = localStorage.getItem('token');
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchBaselines(selectedProjectId);
      fetchVariance(selectedProjectId);
    } else {
      setBaselines([]);
      setVariance(null);
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/project');
      const list = res.data?.data || res.data || [];
      setProjects(list);
      if (list.length > 0 && !selectedProjectId) {
        setSelectedProjectId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
  };

  const fetchBaselines = async (projectId: string) => {
    try {
      const res = await api.get(`/project/${projectId}/baselines`);
      const list = res.data || [];
      setBaselines(list);
      const active = list.find((b: ScheduleBaseline) => b.status === 'ACTIVE');
      if (active) {
        setSelectedBaselineId(active.id);
      } else if (list.length > 0) {
        setSelectedBaselineId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch baselines', err);
    }
  };

  const fetchVariance = async (projectId: string, baselineId?: string) => {
    try {
      const url = baselineId
        ? `/project/${projectId}/baselines/variance?baselineId=${baselineId}`
        : `/project/${projectId}/baselines/variance`;
      const res = await api.get(url);
      setVariance(res.data);
    } catch (err) {
      console.error('Failed to fetch variance', err);
      setVariance(null);
    }
  };

  const handleCreateBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !formName) return;

    try {
      await api.post(`/project/${selectedProjectId}/baselines`, {
        name: formName,
        description: formDesc || undefined,
        reason: formReason || undefined,
        effectiveDate: formEffectiveDate || undefined,
      });
      setIsCreateModalOpen(false);
      setFormName('');
      setFormDesc('');
      setFormReason('');
      await fetchBaselines(selectedProjectId);
      await fetchVariance(selectedProjectId);
    } catch (err) {
      console.error('Failed to create baseline', err);
    }
  };

  const handleActivateBaseline = async (baselineId: string) => {
    if (!selectedProjectId) return;
    try {
      await api.post(
        `/project/${selectedProjectId}/baselines/${baselineId}/activate`,
      );
      await fetchBaselines(selectedProjectId);
      await fetchVariance(selectedProjectId, baselineId);
    } catch (err) {
      console.error('Failed to activate baseline', err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Schedule Baselines & Variance Analysis
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
              M2 Certified
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Capture immutable planning snapshots, activate versioned baselines,
            and inspect deterministic schedule variance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.projectCode ? `(${p.projectCode})` : ''}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Baseline
          </button>
        </div>
      </div>

      {/* Variance KPI Metrics Summary */}
      {variance && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5 bg-slate-900/60 border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Schedule Variance
              </span>
              <Calendar
                className={`w-5 h-5 ${variance.overallScheduleVarianceDays > 0 ? 'text-rose-400' : 'text-emerald-400'}`}
              />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold ${variance.overallScheduleVarianceDays > 0 ? 'text-rose-400' : 'text-emerald-400'}`}
              >
                {variance.overallScheduleVarianceDays > 0 ? '+' : ''}
                {variance.overallScheduleVarianceDays} days
              </span>
              <span className="text-xs text-slate-500">
                ({variance.overallVariancePct > 0 ? '+' : ''}
                {variance.overallVariancePct}%)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active Baseline: {variance.baselineNumber}
            </p>
          </Card>

          <Card className="p-5 bg-slate-900/60 border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Workload Delta
              </span>
              <Clock
                className={`w-5 h-5 ${variance.overallHoursVariance > 0 ? 'text-amber-400' : 'text-blue-400'}`}
              />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold ${variance.overallHoursVariance > 0 ? 'text-amber-400' : 'text-blue-400'}`}
              >
                {variance.overallHoursVariance > 0 ? '+' : ''}
                {variance.overallHoursVariance} hrs
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Planned vs Current Tasks
            </p>
          </Card>

          <Card className="p-5 bg-slate-900/60 border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Schedule Status
              </span>
              {variance.isBehindSchedule ? (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div className="mt-2">
              <span
                className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                  variance.isBehindSchedule
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {variance.isBehindSchedule
                  ? 'BEHIND SCHEDULE'
                  : 'ON SCHEDULE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Variance Threshold</p>
          </Card>

          <Card className="p-5 bg-slate-900/60 border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Baseline Version
              </span>
              <History className="w-5 h-5 text-purple-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">
                v{variance.baselineVersion}
              </span>
              <span className="text-xs text-purple-400 font-mono">
                {variance.baselineNumber}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {baselines.length} total snapshots recorded
            </p>
          </Card>
        </div>
      )}

      {/* Explainability Banner */}
      {variance && (
        <div className="p-4 bg-blue-950/40 border border-blue-800/40 rounded-xl flex items-start gap-3 text-sm text-blue-200">
          <Zap className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-blue-300">
              Audit Calculation Trace:
            </span>{' '}
            {variance.explanation}
          </div>
        </div>
      )}

      {/* Baselines Version History Grid */}
      <Card className="p-6 bg-slate-900/80 border-slate-800">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-blue-400" />
          Baseline Snapshot History
        </h2>

        {baselines.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            No baselines created for this project yet. Click &quot;Create Baseline&quot; to snapshot current planning.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {baselines.map((b) => (
              <div
                key={b.id}
                onClick={() => {
                  setSelectedBaselineId(b.id);
                  fetchVariance(selectedProjectId, b.id);
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedBaselineId === b.id
                    ? 'bg-slate-800/90 border-blue-500 ring-1 ring-blue-500/50'
                    : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-700 text-blue-300">
                    {b.baselineNumber}
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                      b.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : b.status === 'SUPERSEDED'
                        ? 'bg-slate-700 text-slate-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>

                <h3 className="font-medium text-white text-sm mt-2">{b.name}</h3>
                {b.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {b.description}
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Duration: {Number(b.totalPlannedDurationDays || 0)}d
                  </span>
                  <span>Hours: {Number(b.totalPlannedHours || 0)}h</span>
                </div>

                {b.status !== 'ACTIVE' && (
                  <button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleActivateBaseline(b.id);
                    }}
                    className="w-full mt-3 text-xs bg-slate-700 hover:bg-emerald-600 text-white flex items-center justify-center gap-1 py-1.5 rounded-lg transition-colors"
                  >
                    <Play className="w-3 h-3" /> Activate Baseline
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Task & Milestone Variances Table */}
      {variance && (
        <Card className="p-6 bg-slate-900/80 border-slate-800">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            Detailed Planning Item Variances (Baseline vs Current Plan)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Item / Task</th>
                  <th className="p-3">Baseline Plan</th>
                  <th className="p-3">Current Plan</th>
                  <th className="p-3">Duration Variance</th>
                  <th className="p-3">Workload Variance</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {variance.taskVariances.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="p-3 font-medium text-white">
                      {t.title}
                      {t.stageCode && (
                        <span className="ml-2 text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                          {t.stageCode}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-slate-400">
                      {t.baselineDurationDays}d ({t.baselineHours}h)
                    </td>
                    <td className="p-3 text-xs text-slate-300">
                      {t.currentDurationDays}d ({t.currentHours}h)
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs font-semibold ${
                          t.durationVarianceDays > 0
                            ? 'text-rose-400'
                            : t.durationVarianceDays < 0
                            ? 'text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {t.durationVarianceDays > 0 ? '+' : ''}
                        {t.durationVarianceDays} days
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs font-semibold ${
                          t.hoursVariance > 0
                            ? 'text-amber-400'
                            : t.hoursVariance < 0
                            ? 'text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {t.hoursVariance > 0 ? '+' : ''}
                        {t.hoursVariance} hrs
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Baseline Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Schedule Baseline Snapshot"
      >
        <form onSubmit={handleCreateBaseline} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Baseline Name *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Contract Kickoff Baseline"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={2}
              placeholder="Detailed description of schedule agreements..."
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Revision / Kickoff Reason
            </label>
            <input
              type="text"
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="e.g. Scope re-baseline approved by management"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Effective Date
            </label>
            <input
              type="date"
              value={formEffectiveDate}
              onChange={(e) => setFormEffectiveDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Save Frozen Snapshot
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
