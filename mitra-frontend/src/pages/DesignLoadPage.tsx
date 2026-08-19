import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import {
  Layers,
  Cpu,
  Clock,
  CheckCircle2,
  Plus,
  Search,
  Users,
  Sparkles,
  Award,
  RefreshCw,
  Monitor,
  Activity,
  BarChart3,
  CheckSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  CANCELLED: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

const STAGE_STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  BLOCKED: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

export function DesignLoadPage() {
  const [activeTab, setActiveTab] = useState<'loads' | 'standards' | 'systems'>('loads');
  const queryClient = useQueryClient();

  // ── Tab 1: Loads state ───────────────────────────────────────────────────
  const [loadSearch, setLoadSearch] = useState('');
  const [loadStatusFilter, setLoadStatusFilter] = useState('');
  const [selectedLoad, setSelectedLoad] = useState<any>(null);
  const [showCreateLoadModal, setShowCreateLoadModal] = useState(false);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [selectedStage, setSelectedStage] = useState<any>(null);

  // Form states
  const [newLoadData, setNewLoadData] = useState({
    projectId: '',
    standardId: '',
    title: '',
    complexityFactor: 1.0,
    plannedStartDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [estimateData, setEstimateData] = useState({
    complexityFactor: 1.0,
    plannedStartDate: '',
    standardId: '',
  });

  const [stageUpdateData, setStageUpdateData] = useState({
    status: 'IN_PROGRESS',
    actualDurationDays: 0,
    actualHours: 0,
    assignedEmployeeId: '',
    assignedDesignSystemId: '',
    notes: '',
  });

  // ── Tab 2: Standards state ───────────────────────────────────────────────
  const [standardSearch, setStandardSearch] = useState('');
  const [selectedStandard, setSelectedStandard] = useState<any>(null);
  const [showCreateStandardModal, setShowCreateStandardModal] = useState(false);
  const [showStandardDetailModal, setShowStandardDetailModal] = useState(false);

  const [newStandardData, setNewStandardData] = useState({
    code: '',
    name: '',
    description: '',
    projectType: 'NEW_DEVELOPMENT',
    moldType: 'INJECTION',
    complexityLevel: 'STANDARD',
    provenanceSource: 'MANUAL',
    stages: [
      { stageCode: 'MOLD_DEVELOPMENT', stageName: 'Mold Development', sequence: 1, standardDurationDays: 2.0, standardHours: 16.0, minimumProficiency: 'INTERMEDIATE', requiredSkillId: '' },
      { stageCode: 'DESIGNING', stageName: 'Designing', sequence: 2, standardDurationDays: 4.0, standardHours: 32.0, minimumProficiency: 'ADVANCED', requiredSkillId: '' },
      { stageCode: 'DETAILING', stageName: 'Detailing', sequence: 3, standardDurationDays: 3.0, standardHours: 24.0, minimumProficiency: 'INTERMEDIATE', requiredSkillId: '' },
      { stageCode: 'FILE_SUBMISSION', stageName: 'File Submission', sequence: 4, standardDurationDays: 1.0, standardHours: 8.0, minimumProficiency: 'BEGINNER', requiredSkillId: '' },
    ],
  });

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: loadsResponse, isLoading: loadsLoading } = useQuery({
    queryKey: ['design-loads', loadSearch, loadStatusFilter],
    queryFn: () =>
      api
        .get('/design-loads', {
          params: {
            search: loadSearch || undefined,
            status: loadStatusFilter || undefined,
          },
        })
        .then((r) => r.data),
  });

  const { data: standardsResponse } = useQuery({
    queryKey: ['design-standards', standardSearch],
    queryFn: () =>
      api
        .get('/design-standards', {
          params: { search: standardSearch || undefined },
        })
        .then((r) => r.data),
  });

  const { data: systemsResponse } = useQuery({
    queryKey: ['design-systems'],
    queryFn: () => api.get('/design-systems').then((r) => r.data),
  });

  const { data: shiftsResponse } = useQuery({
    queryKey: ['design-shifts'],
    queryFn: () => api.get('/design-systems/shifts').then((r) => r.data),
  });

  const { data: projectsResponse } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => api.get('/project?limit=100').then((r) => r.data?.data || r.data || []),
  });

  const { data: candidatesResponse, isLoading: candidatesLoading } = useQuery({
    queryKey: ['design-load-candidates', selectedLoad?.id, selectedStage?.id],
    queryFn: () =>
      selectedLoad?.id
        ? api
            .get(`/design-loads/${selectedLoad.id}/candidates`, {
              params: { stageId: selectedStage?.id || undefined },
            })
            .then((r) => r.data)
        : null,
    enabled: !!selectedLoad?.id && showCandidatesModal,
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const createLoadMutation = useMutation({
    mutationFn: (data: any) => api.post('/design-loads', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-loads'] });
      setShowCreateLoadModal(false);
      toast.success('Project design load created successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create design load');
    },
  });

  const estimateLoadMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.post(`/design-loads/${id}/estimate`, data).then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['design-loads'] });
      setSelectedLoad(updated);
      setShowEstimateModal(false);
      toast.success('Design load re-estimated successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to re-estimate design load');
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ stageId, data }: { stageId: string; data: any }) =>
      api.patch(`/design-loads/stages/${stageId}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-loads'] });
      setShowStageModal(false);
      toast.success('Stage progress updated successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update stage');
    },
  });

  const createStandardMutation = useMutation({
    mutationFn: (data: any) => api.post('/design-standards', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-standards'] });
      setShowCreateStandardModal(false);
      toast.success('Design standard created successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create design standard');
    },
  });

  const seedDefaultsMutation = useMutation({
    mutationFn: () => api.post('/design-systems/seed-defaults').then((r) => r.data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['design-systems'] });
      queryClient.invalidateQueries({ queryKey: ['design-shifts'] });
      toast.success(`Seeded ${res.systemsCount} workstations and ${res.shiftsCount} shifts`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to seed workstations');
    },
  });

  const loads = loadsResponse?.data || [];
  const standards = standardsResponse?.data || [];
  const systems = systemsResponse?.data || [];
  const shifts = shiftsResponse || [];
  const projects = Array.isArray(projectsResponse) ? projectsResponse : [];

  // Summary Metrics
  const totalLoads = loads.length;
  const inProgressLoads = loads.filter((l: any) => l.status === 'IN_PROGRESS').length;
  const totalPlannedHrs = loads.reduce((acc: number, l: any) => acc + Number(l.plannedHours || 0), 0);
  const totalActualHrs = loads.reduce((acc: number, l: any) => acc + Number(l.actualHours || 0), 0);
  const totalCapacityHrs = Number(systemsResponse?.totalDailyCapacityHours || 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Design-Load & Workload Intelligence
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              M2 Engine
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Standard vs planned design loads, stage duration breakdown, engineering skill matching, and 10 CAD workstation shift capacity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'loads' && (
            <button
              onClick={() => setShowCreateLoadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Project Design Load
            </button>
          )}

          {activeTab === 'standards' && (
            <button
              onClick={() => setShowCreateStandardModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Design Standard
            </button>
          )}

          {activeTab === 'systems' && systems.length === 0 && (
            <button
              onClick={() => seedDefaultsMutation.mutate()}
              disabled={seedDefaultsMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Seed 10 CAD Workstations & 3 Shifts
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Total Design Loads</p>
              <p className="text-2xl font-bold text-white mt-1">{totalLoads}</p>
            </div>
            <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">In Progress</p>
              <p className="text-2xl font-bold text-cyan-400 mt-1">{inProgressLoads}</p>
            </div>
            <div className="p-2.5 bg-cyan-500/10 rounded-lg text-cyan-400 border border-cyan-500/20">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Total Planned Hours</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{totalPlannedHrs.toFixed(1)} h</p>
            </div>
            <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Actual Logged Hours</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{totalActualHrs.toFixed(1)} h</p>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Daily CAD Capacity</p>
              <p className="text-2xl font-bold text-purple-400 mt-1">
                {totalCapacityHrs > 0 ? `${totalCapacityHrs} h/day` : `${systems.length * 24} h/day`}
              </p>
            </div>
            <div className="p-2.5 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
              <Monitor className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-6">
        <button
          onClick={() => setActiveTab('loads')}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
            activeTab === 'loads' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Project Design Loads
          {loads.length > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">
              {loads.length}
            </span>
          )}
          {activeTab === 'loads' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('standards')}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
            activeTab === 'standards' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Design Standards Master
          {standards.length > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-500/20 text-indigo-400">
              {standards.length}
            </span>
          )}
          {activeTab === 'standards' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('systems')}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
            activeTab === 'systems' ? 'text-purple-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          10 CAD Workstations & 3 Shifts
          {systems.length > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400">
              {systems.length} Systems
            </span>
          )}
          {activeTab === 'systems' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
          )}
        </button>
      </div>

      {/* ── TAB 1: PROJECT DESIGN LOADS ────────────────────────────────────── */}
      {activeTab === 'loads' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Load #, Project Title..."
                value={loadSearch}
                onChange={(e) => setLoadSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={loadStatusFilter}
              onChange={(e) => setLoadStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Loads Table */}
          <Card className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-0">
              <DataTable
                columns={[
                  {
                    key: 'loadNumber',
                    header: 'Load Number',
                    render: (item: any) => (
                      <div>
                        <div className="font-mono text-sm font-semibold text-blue-400">
                          {item.loadNumber}
                        </div>
                        <div className="text-xs text-slate-400 line-clamp-1">{item.title}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'standard',
                    header: 'Standard / Complexity',
                    render: (item: any) => (
                      <div>
                        <div className="text-xs font-medium text-slate-200">
                          {item.standard?.name || 'Custom / None'}
                        </div>
                        <div className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                          <span>Factor: {Number(item.complexityFactor || 1).toFixed(2)}x</span>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'duration',
                    header: 'Standard vs Planned',
                    render: (item: any) => (
                      <div className="text-xs">
                        <span className="text-slate-400">Std: </span>
                        <span className="font-medium text-slate-300">{Number(item.standardDurationDays || 0).toFixed(1)}d ({Number(item.standardHours || 0).toFixed(0)}h)</span>
                        <div className="mt-0.5">
                          <span className="text-slate-400">Plan: </span>
                          <span className="font-semibold text-amber-400">{Number(item.plannedDurationDays || 0).toFixed(1)}d ({Number(item.plannedHours || 0).toFixed(0)}h)</span>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'actuals',
                    header: 'Actuals & Variance',
                    render: (item: any) => {
                      const actualDays = Number(item.actualDurationDays || 0);
                      const plannedDays = Number(item.plannedDurationDays || 0);
                      const diff = actualDays - plannedDays;
                      return (
                        <div className="text-xs">
                          <span className="text-slate-300 font-medium">{actualDays > 0 ? `${actualDays.toFixed(1)}d (${Number(item.actualHours || 0).toFixed(0)}h)` : '—'}</span>
                          {actualDays > 0 && (
                            <div className={`mt-0.5 font-medium ${diff <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {diff <= 0 ? `-${Math.abs(diff).toFixed(1)}d early` : `+${diff.toFixed(1)}d overrun`}
                            </div>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    key: 'stage',
                    header: 'Current Stage',
                    render: (item: any) => (
                      <span className="px-2 py-1 text-xs rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {item.currentStageCode}
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (item: any) => {
                      const colorClass = STATUS_COLORS[item.status] || STATUS_COLORS.DRAFT;
                      return (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colorClass}`}>
                          {item.status}
                        </span>
                      );
                    },
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    render: (item: any) => (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedLoad(item);
                            setEstimateData({
                              complexityFactor: Number(item.complexityFactor || 1.0),
                              plannedStartDate: item.plannedStartDate || '',
                              standardId: item.standardId || '',
                            });
                            setShowEstimateModal(true);
                          }}
                          className="px-2 py-1 text-xs rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Estimate
                        </button>

                        <button
                          onClick={() => {
                            setSelectedLoad(item);
                            setSelectedStage(item.stages?.[0] || null);
                            setShowCandidatesModal(true);
                          }}
                          className="px-2 py-1 text-xs rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 flex items-center gap-1"
                        >
                          <Users className="w-3 h-3" />
                          Candidates
                        </button>
                      </div>
                    ),
                  },
                ]}
                data={loads}
                loading={loadsLoading}
              />
            </CardContent>
          </Card>

          {/* Stages Breakdown of Active/Selected Loads */}
          {loads.length > 0 && (
            <div className="mt-8 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-400" />
                Stage-Level Execution Breakdown ({loads[0]?.loadNumber})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(loads[0]?.stages || []).map((stage: any) => (
                  <Card key={stage.id} className="bg-slate-900/60 border-slate-800 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 right-0 h-1 ${
                      stage.status === 'COMPLETED' ? 'bg-emerald-500' : stage.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-700'
                    }`} />
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-400">Stage {stage.sequence}</span>
                        <span className={`px-2 py-0.5 text-xs rounded border ${STAGE_STATUS_COLORS[stage.status] || STAGE_STATUS_COLORS.NOT_STARTED}`}>
                          {stage.status}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-white">{stage.stageName}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Code: {stage.stageCode}</p>
                      </div>

                      <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 text-xs space-y-1">
                        <div className="flex justify-between text-slate-400">
                          <span>Standard:</span>
                          <span className="text-slate-200">{Number(stage.standardDurationDays).toFixed(1)}d ({Number(stage.standardHours).toFixed(0)}h)</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Planned:</span>
                          <span className="text-amber-400 font-medium">{Number(stage.plannedDurationDays).toFixed(1)}d ({Number(stage.plannedHours).toFixed(0)}h)</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Actual:</span>
                          <span className="text-emerald-400 font-medium">{stage.actualDurationDays ? `${Number(stage.actualDurationDays).toFixed(1)}d` : '—'}</span>
                        </div>
                      </div>

                      {stage.minimumProficiency && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Award className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Req: {stage.minimumProficiency}</span>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setSelectedLoad(loads[0]);
                          setSelectedStage(stage);
                          setStageUpdateData({
                            status: stage.status,
                            actualDurationDays: Number(stage.actualDurationDays || stage.plannedDurationDays || 0),
                            actualHours: Number(stage.actualHours || stage.plannedHours || 0),
                            assignedEmployeeId: stage.assignedEmployeeId || '',
                            assignedDesignSystemId: stage.assignedDesignSystemId || '',
                            notes: stage.notes || '',
                          });
                          setShowStageModal(true);
                        }}
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded transition-colors"
                      >
                        Update Progress
                      </button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: DESIGN STANDARDS MASTER ─────────────────────────────────── */}
      {activeTab === 'standards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Design Standards..."
                value={standardSearch}
                onChange={(e) => setStandardSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {standards.map((std: any) => (
              <Card key={std.id} className="bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-all">
                <CardHeader className="p-4 border-b border-slate-800/60 flex flex-row items-center justify-between">
                  <div>
                    <span className="font-mono text-xs text-indigo-400 font-semibold">{std.code}</span>
                    <h3 className="text-base font-bold text-white mt-0.5">{std.name}</h3>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {std.complexityLevel}
                  </span>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  <p className="text-xs text-slate-400 line-clamp-2">{std.description || 'Configurable planning standard.'}</p>

                  <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                    <div>
                      <p className="text-xs text-slate-400">Total Duration</p>
                      <p className="text-base font-bold text-white mt-0.5">{Number(std.totalStandardDurationDays).toFixed(1)} Days</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Standard Workload</p>
                      <p className="text-base font-bold text-amber-400 mt-0.5">{Number(std.totalStandardHours).toFixed(0)} Hours</p>
                    </div>
                  </div>

                  {/* Stage list */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-300">Lifecycle Stages ({std.stages?.length || 0})</p>
                    {(std.stages || []).map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-300">{s.stageName}</span>
                        <span className="text-slate-400 font-mono">{Number(s.standardDurationDays).toFixed(1)}d ({Number(s.standardHours).toFixed(0)}h)</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs text-slate-400">
                    <span>Source: {std.provenanceSource}</span>
                    <button
                      onClick={() => {
                        setSelectedStandard(std);
                        setShowStandardDetailModal(true);
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      View Details →
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: DESIGN SYSTEMS & 3 SHIFTS ──────────────────────────────── */}
      {activeTab === 'systems' && (
        <div className="space-y-6">
          {/* Top capacity banner */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-purple-900/30 via-slate-900 to-indigo-900/30 border border-purple-800/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-bold text-white">Design CAD Studio Capacity & 3-Shift Model</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Design department operates 10 high-performance CAD workstations across 3 continuous shifts for around-the-clock mold engineering.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400">Active Workstations</p>
                <p className="text-xl font-bold text-purple-400">{systems.length}</p>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div className="text-right">
                <p className="text-xs text-slate-400">Continuous Shifts</p>
                <p className="text-xl font-bold text-cyan-400">{shifts.length || 3}</p>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div className="text-right">
                <p className="text-xs text-slate-400">Max Design Throughput</p>
                <p className="text-xl font-bold text-emerald-400">{systems.length * 24} h/day</p>
              </div>
            </div>
          </div>

          {/* Shifts Breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Configured Design Shifts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(shifts.length > 0
                ? shifts
                : [
                    { shiftCode: 'SHIFT_1', name: 'Morning Shift', startTime: '06:00', endTime: '14:00', durationHours: 8.0 },
                    { shiftCode: 'SHIFT_2', name: 'Evening Shift', startTime: '14:00', endTime: '22:00', durationHours: 8.0 },
                    { shiftCode: 'SHIFT_3', name: 'Night Shift', startTime: '22:00', endTime: '06:00', durationHours: 8.0 },
                  ]
              ).map((s: any) => (
                <div key={s.shiftCode} className="p-3.5 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-xs text-cyan-400 font-semibold">{s.shiftCode}</div>
                    <div className="text-sm font-bold text-white mt-0.5">{s.name}</div>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-slate-300 font-medium">{s.startTime} – {s.endTime}</span>
                    <div className="text-emerald-400 font-bold mt-0.5">{Number(s.durationHours).toFixed(1)} hrs</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workstations Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-purple-400" />
              CAD Workstations ({systems.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systems.map((ws: any) => (
                <Card key={ws.id} className="bg-slate-900/60 border-slate-800">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-purple-400">{ws.systemCode}</span>
                      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {ws.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">{ws.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{ws.location || 'Design Engineering Studio'}</p>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1 bg-slate-950/60 p-2.5 rounded border border-slate-800">
                      <div><strong className="text-slate-300">Hardware:</strong> {ws.specifications || 'High-Performance Workstation'}</div>
                      <div><strong className="text-slate-300">CAD Software:</strong> {ws.softwareLicenses || 'Siemens NX, Moldflow'}</div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800 text-slate-400">
                      <span>Shifts Supported: {ws.totalShiftsSupported || 3}</span>
                      <span className="text-purple-300 font-bold">{Number(ws.dailyCapacityHours || 24).toFixed(0)} h/day</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE DESIGN LOAD ──────────────────────────────────────── */}
      {showCreateLoadModal && (
        <Modal
          isOpen={showCreateLoadModal}
          onClose={() => setShowCreateLoadModal(false)}
          title="Create Project Design Load"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newLoadData.projectId) {
                toast.error('Please select a project');
                return;
              }
              createLoadMutation.mutate(newLoadData);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Select Project *</label>
              <select
                value={newLoadData.projectId}
                onChange={(e) => setNewLoadData({ ...newLoadData, projectId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Select Project</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.projectCode || p.customerName || 'Project'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Design Standard Baseline</label>
              <select
                value={newLoadData.standardId}
                onChange={(e) => setNewLoadData({ ...newLoadData, standardId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">Custom / No Standard</option>
                {standards.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code} — {Number(s.totalStandardDurationDays).toFixed(0)}d / {Number(s.totalStandardHours).toFixed(0)}h)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Design Load Title *</label>
              <input
                type="text"
                value={newLoadData.title}
                onChange={(e) => setNewLoadData({ ...newLoadData, title: e.target.value })}
                placeholder="e.g. 500ml Blow Mold Design & Detailing"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Complexity Factor (0.1 - 5.0)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="5.0"
                  value={newLoadData.complexityFactor}
                  onChange={(e) => setNewLoadData({ ...newLoadData, complexityFactor: parseFloat(e.target.value) || 1.0 })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Planned Start Date</label>
                <input
                  type="date"
                  value={newLoadData.plannedStartDate}
                  onChange={(e) => setNewLoadData({ ...newLoadData, plannedStartDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateLoadModal(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoadMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg shadow-lg transition-all"
              >
                {createLoadMutation.isPending ? 'Creating...' : 'Create Design Load'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: ESTIMATE / ADJUST LOAD ──────────────────────────────────── */}
      {showEstimateModal && selectedLoad && (
        <Modal
          isOpen={showEstimateModal}
          onClose={() => setShowEstimateModal(false)}
          title={`Re-Estimate Design Load: ${selectedLoad.loadNumber}`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              estimateLoadMutation.mutate({
                id: selectedLoad.id,
                data: estimateData,
              });
            }}
            className="space-y-4"
          >
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
              <p className="text-slate-400">Current Base Standard: <strong className="text-slate-200">{Number(selectedLoad.standardDurationDays).toFixed(1)} Days ({Number(selectedLoad.standardHours).toFixed(0)} Hours)</strong></p>
              <p className="text-slate-400">Current Planned: <strong className="text-amber-400">{Number(selectedLoad.plannedDurationDays).toFixed(1)} Days ({Number(selectedLoad.plannedHours).toFixed(0)} Hours)</strong></p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">New Complexity Factor (0.1 - 5.0)</label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="5.0"
                value={estimateData.complexityFactor}
                onChange={(e) => setEstimateData({ ...estimateData, complexityFactor: parseFloat(e.target.value) || 1.0 })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                required
              />
              <p className="text-xs text-slate-400 mt-1">
                Estimated Planned Days: {(Number(selectedLoad.standardDurationDays || 10) * estimateData.complexityFactor).toFixed(1)} days ({(Number(selectedLoad.standardHours || 80) * estimateData.complexityFactor).toFixed(0)} hrs)
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Planned Start Date</label>
              <input
                type="date"
                value={estimateData.plannedStartDate}
                onChange={(e) => setEstimateData({ ...estimateData, plannedStartDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {selectedLoad.explanation && (
              <div className="p-3 bg-blue-950/30 border border-blue-800/30 rounded-lg text-xs text-blue-300">
                <span className="font-semibold block mb-1">Calculation Provenance:</span>
                {selectedLoad.explanation}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowEstimateModal(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={estimateLoadMutation.isPending}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg shadow-lg transition-all"
              >
                {estimateLoadMutation.isPending ? 'Re-Estimating...' : 'Apply Estimate'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: STAGE PROGRESSION ───────────────────────────────────────── */}
      {showStageModal && selectedStage && (
        <Modal
          isOpen={showStageModal}
          onClose={() => setShowStageModal(false)}
          title={`Update Stage: ${selectedStage.stageName}`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateStageMutation.mutate({
                stageId: selectedStage.id,
                data: stageUpdateData,
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Stage Status</label>
              <select
                value={stageUpdateData.status}
                onChange={(e) => setStageUpdateData({ ...stageUpdateData, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Actual Duration (Days)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stageUpdateData.actualDurationDays}
                  onChange={(e) => setStageUpdateData({ ...stageUpdateData, actualDurationDays: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Actual Workload (Hours)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={stageUpdateData.actualHours}
                  onChange={(e) => setStageUpdateData({ ...stageUpdateData, actualHours: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Assigned CAD Workstation</label>
              <select
                value={stageUpdateData.assignedDesignSystemId}
                onChange={(e) => setStageUpdateData({ ...stageUpdateData, assignedDesignSystemId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">None Assigned</option>
                {systems.map((ws: any) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.systemCode} — {ws.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowStageModal(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateStageMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg shadow-lg transition-all"
              >
                {updateStageMutation.isPending ? 'Saving...' : 'Save Stage Progress'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: CANDIDATE ENGINEERS ─────────────────────────────────────── */}
      {showCandidatesModal && selectedLoad && (
        <Modal
          isOpen={showCandidatesModal}
          onClose={() => setShowCandidatesModal(false)}
          title={`Qualified Engineer Candidates (${selectedLoad.loadNumber})`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-400">Required Skill: </span>
                <span className="font-semibold text-indigo-400">{candidatesResponse?.requiredSkillId || 'CAD / Mold Engineering'}</span>
              </div>
              <div>
                <span className="text-slate-400">Min Proficiency: </span>
                <span className="font-semibold text-emerald-400">{candidatesResponse?.minimumProficiency || 'INTERMEDIATE'}</span>
              </div>
            </div>

            {candidatesLoading ? (
              <p className="text-sm text-slate-400 text-center py-6">Searching qualified engineers...</p>
            ) : (candidatesResponse?.candidates || []).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No engineer candidates found matching the skill criteria.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {candidatesResponse.candidates.map((cand: any) => (
                  <div
                    key={cand.employeeId}
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      cand.isQualified
                        ? 'bg-slate-900/80 border-emerald-500/30'
                        : 'bg-slate-900/40 border-slate-800 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{cand.fullName}</span>
                        <span className="text-xs font-mono text-slate-400">({cand.employeeCode})</span>
                        {cand.isQualified && (
                          <span className="px-1.5 py-0.5 text-2xs font-semibold rounded bg-emerald-500/20 text-emerald-400">
                            Qualified
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {cand.designation} • {cand.department}
                      </div>
                      {cand.certification && (
                        <div className="text-xs text-indigo-300 flex items-center gap-1 mt-1">
                          <Award className="w-3 h-3" />
                          {cand.certification}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 text-xs font-bold rounded bg-slate-800 text-slate-200 border border-slate-700">
                        {cand.proficiencyLevel || 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCandidatesModal(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: CREATE DESIGN STANDARD ─────────────────────────────────── */}
      {showCreateStandardModal && (
        <Modal
          isOpen={showCreateStandardModal}
          onClose={() => setShowCreateStandardModal(false)}
          title="Create Configurable Design Standard"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createStandardMutation.mutate(newStandardData);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Standard Code *</label>
                <input
                  type="text"
                  placeholder="e.g. STD-TYPE-B"
                  value={newStandardData.code}
                  onChange={(e) => setNewStandardData({ ...newStandardData, code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Standard Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Type B Standard Mold (10 Days)"
                  value={newStandardData.name}
                  onChange={(e) => setNewStandardData({ ...newStandardData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
              <textarea
                rows={2}
                value={newStandardData.description}
                onChange={(e) => setNewStandardData({ ...newStandardData, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Configured Stage Durations</label>
              {newStandardData.stages.map((stg, idx) => (
                <div key={stg.stageCode} className="grid grid-cols-4 gap-2 bg-slate-950/60 p-2.5 rounded border border-slate-800 text-xs items-center">
                  <span className="font-semibold text-slate-200">{stg.stageName}</span>
                  <div>
                    <label className="text-2xs text-slate-400 block">Days</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      value={stg.standardDurationDays}
                      onChange={(e) => {
                        const days = parseFloat(e.target.value) || 0;
                        const stages = [...newStandardData.stages];
                        stages[idx].standardDurationDays = days;
                        stages[idx].standardHours = days * 8.0;
                        setNewStandardData({ ...newStandardData, stages });
                      }}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-2xs text-slate-400 block">Hours</label>
                    <input
                      type="number"
                      step="1"
                      value={stg.standardHours}
                      onChange={(e) => {
                        const hrs = parseFloat(e.target.value) || 0;
                        const stages = [...newStandardData.stages];
                        stages[idx].standardHours = hrs;
                        setNewStandardData({ ...newStandardData, stages });
                      }}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-2xs text-slate-400 block">Proficiency</label>
                    <select
                      value={stg.minimumProficiency}
                      onChange={(e) => {
                        const stages = [...newStandardData.stages];
                        stages[idx].minimumProficiency = e.target.value;
                        setNewStandardData({ ...newStandardData, stages });
                      }}
                      className="w-full px-1.5 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200 text-xs"
                    >
                      <option value="BEGINNER">BEGINNER</option>
                      <option value="INTERMEDIATE">INTERMEDIATE</option>
                      <option value="ADVANCED">ADVANCED</option>
                      <option value="EXPERT">EXPERT</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateStandardModal(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createStandardMutation.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-lg transition-all"
              >
                {createStandardMutation.isPending ? 'Creating...' : 'Create Standard'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: STANDARD DETAILS ────────────────────────────────────────── */}
      {showStandardDetailModal && selectedStandard && (
        <Modal
          isOpen={showStandardDetailModal}
          onClose={() => setShowStandardDetailModal(false)}
          title={`Standard: ${selectedStandard.name}`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs space-y-1">
              <div><span className="text-slate-400">Code:</span> <span className="font-mono text-indigo-400">{selectedStandard.code}</span></div>
              <div><span className="text-slate-400">Complexity:</span> <span className="text-slate-200">{selectedStandard.complexityLevel}</span></div>
              <div><span className="text-slate-400">Total Standard Duration:</span> <strong className="text-white">{Number(selectedStandard.totalStandardDurationDays).toFixed(1)} Days ({Number(selectedStandard.totalStandardHours).toFixed(0)} Hours)</strong></div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300">Configured Stage Breakdown</h4>
              {(selectedStandard.stages || []).map((s: any) => (
                <div key={s.id} className="p-2.5 rounded bg-slate-900 border border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white">{s.sequence}. {s.stageName}</span>
                    <span className="text-slate-400 text-2xs block">Req: {s.minimumProficiency}</span>
                  </div>
                  <span className="font-mono text-amber-400">{Number(s.standardDurationDays).toFixed(1)}d / {Number(s.standardHours).toFixed(0)}h</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowStandardDetailModal(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
