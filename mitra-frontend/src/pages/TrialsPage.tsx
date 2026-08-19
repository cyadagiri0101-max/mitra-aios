import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Plus, Search, AlertTriangle, RefreshCw, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export function TrialsPage() {
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('ALL');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isRetrialModalOpen, setIsRetrialModalOpen] = useState(false);
  const [isEcrModalOpen, setIsEcrModalOpen] = useState(false);
  const [selectedTrial, setSelectedTrial] = useState<any>(null);

  // Form states
  const [newForm, setNewForm] = useState({
    trialNumber: `TRL-${Date.now().toString(36).toUpperCase()}`,
    trialType: 'INTERNAL',
    trialDate: new Date().toISOString().slice(0, 10),
    shift: 'SHIFT_1',
    moldTemperatureC: '45.0',
    materialTemperatureC: '230.0',
    injectionPressureBar: '120.0',
    cycleTimeSeconds: '18.5',
    shotsTaken: 20,
    goodParts: 18,
    rejectedParts: 2,
    observations: '',
    defectsObserved: '',
    correctiveActions: '',
    result: 'PENDING',
  });

  const [retrialReason, setRetrialReason] = useState('');
  const [retrialChanges, setRetrialChanges] = useState('');
  const [ecrTitle, setEcrTitle] = useState('');
  const [ecrReason, setEcrReason] = useState('');

  const queryClient = useQueryClient();

  const { data: trials, isLoading, error } = useQuery({
    queryKey: ['trial-observations'],
    queryFn: () =>
      api.get('/quality/trials').then((r) => {
        const p = r.data;
        return Array.isArray(p) ? p : (p?.data ?? []);
      }),
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });

  const createTrialMutation = useMutation({
    mutationFn: (payload: any) =>
      api.post('/quality/trials', {
        ...payload,
        moldTemperatureC: Number(payload.moldTemperatureC),
        materialTemperatureC: Number(payload.materialTemperatureC),
        injectionPressureBar: Number(payload.injectionPressureBar),
        cycleTimeSeconds: Number(payload.cycleTimeSeconds),
        shotsTaken: Number(payload.shotsTaken),
        goodParts: Number(payload.goodParts),
        rejectedParts: Number(payload.rejectedParts),
        defectsObserved: payload.defectsObserved
          ? payload.defectsObserved.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-observations'] });
      toast.success('Tooling trial recorded successfully');
      setIsNewModalOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to record trial'),
  });

  const requestRetrialMutation = useMutation({
    mutationFn: ({ id, reason, changes }: { id: string; reason: string; changes: string }) =>
      api.post(`/quality/trials/${id}/request-retrial`, {
        retrialReason: reason,
        changesMade: changes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-observations'] });
      toast.success('Retrial requested and scheduled');
      setIsRetrialModalOpen(false);
      setSelectedTrial(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to request retrial'),
  });

  const createEcrMutation = useMutation({
    mutationFn: ({ id, title, reason }: { id: string; title: string; reason: string }) =>
      api.post(`/quality/trials/${id}/create-ecr`, { title, reason }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['trial-observations'] });
      toast.success(`ECR created: ${res.data?.ecr_number || res.data?.ecrNumber || 'Success'}`);
      setIsEcrModalOpen(false);
      setSelectedTrial(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create ECR'),
  });

  const filtered = (trials || []).filter((r: any) => {
    const matchesSearch =
      (r.trialNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.observations || '').toLowerCase().includes(search.toLowerCase());
    const matchesResult = resultFilter === 'ALL' || r.result === resultFilter;
    return matchesSearch && matchesResult;
  });

  const columns = [
    {
      key: 'trialNumber',
      header: 'Trial # / Seq',
      render: (r: any) => (
        <div>
          <span className="font-semibold text-slate-100">{r.trialNumber}</span>
          <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
            T{r.trialSequence - 1 >= 0 ? r.trialSequence - 1 : 0}
          </span>
        </div>
      ),
    },
    {
      key: 'trialType',
      header: 'Type',
      render: (r: any) => (
        <span className="text-xs uppercase tracking-wider text-slate-400">{r.trialType || 'INTERNAL'}</span>
      ),
    },
    {
      key: 'result',
      header: 'Result',
      render: (r: any) => {
        const cls =
          r.result === 'PASS'
            ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30'
            : r.result === 'FAIL'
            ? 'bg-rose-500/10 text-rose-200 border-rose-500/30'
            : r.result === 'CONDITIONAL'
            ? 'bg-amber-500/10 text-amber-200 border-amber-500/30'
            : 'bg-slate-700/80 text-slate-300 border-slate-600';
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
            {r.result}
          </span>
        );
      },
    },
    {
      key: 'parameters',
      header: 'Process Parameters',
      render: (r: any) => (
        <div className="text-xs space-y-0.5 text-slate-300">
          <div>Temp: <span className="text-slate-100 font-mono">{r.moldTemperatureC || '-'}°C</span></div>
          <div>Pressure: <span className="text-slate-100 font-mono">{r.injectionPressureBar || '-'} bar</span></div>
          <div>Cycle: <span className="text-slate-100 font-mono">{r.cycleTimeSeconds || '-'} s</span></div>
        </div>
      ),
    },
    {
      key: 'shots',
      header: 'Shots (Good / Rej)',
      render: (r: any) => (
        <div className="text-xs text-slate-300">
          <span className="text-emerald-400 font-mono font-medium">{r.goodParts ?? 0}</span> /{' '}
          <span className="text-rose-400 font-mono font-medium">{r.rejectedParts ?? 0}</span>
          <span className="text-slate-500 ml-1">({r.shotsTaken ?? 0} total)</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r: any) => (
        <div className="flex items-center gap-2">
          {r.result !== 'PASS' && (
            <>
              <button
                onClick={() => {
                  setSelectedTrial(r);
                  setRetrialReason(`Remediation for trial ${r.trialNumber}`);
                  setRetrialChanges('');
                  setIsRetrialModalOpen(true);
                }}
                className="px-2 py-1 text-xs font-medium rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Retrial
              </button>
              <button
                onClick={() => {
                  setSelectedTrial(r);
                  setEcrTitle(`Tooling Revision from Trial ${r.trialNumber}`);
                  setEcrReason(`Observed defects in ${r.trialNumber}`);
                  setIsEcrModalOpen(true);
                }}
                className="px-2 py-1 text-xs font-medium rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 flex items-center gap-1"
              >
                <FileText className="w-3 h-3" /> ECR
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Tooling & Mold Trials</h1>
          <p className="text-sm text-slate-400 mt-1">
            Governed mold testing (T0 → T1 → T2), process telemetry, defect logging, and closed-loop engineering changes.
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20"
          onClick={() => setIsNewModalOpen(true)}
        >
          <Plus className="w-4 h-4" /> Record New Trial
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-sm text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Failed to load trial observations.
        </div>
      )}

      <Card className="border border-white/10 bg-slate-900/60 backdrop-blur-md">
        <CardHeader className="border-b border-white/5 pb-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search trial number, observations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs uppercase tracking-wider text-slate-400">Result:</span>
              <select
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value)}
                className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Results</option>
                <option value="PASS">PASS</option>
                <option value="FAIL">FAIL</option>
                <option value="CONDITIONAL">CONDITIONAL</option>
                <option value="PENDING">PENDING</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable columns={columns} data={filtered} loading={isLoading} />
        </CardContent>
      </Card>

      {/* New Trial Modal */}
      <Modal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} title="Record Tooling Trial">
        <div className="space-y-4 text-sm text-slate-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Trial Number</label>
              <input
                type="text"
                value={newForm.trialNumber}
                onChange={(e) => setNewForm({ ...newForm, trialNumber: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Trial Type</label>
              <select
                value={newForm.trialType}
                onChange={(e) => setNewForm({ ...newForm, trialType: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs"
              >
                <option value="INTERNAL">INTERNAL (T0/T1)</option>
                <option value="CUSTOMER">CUSTOMER WITNESS</option>
                <option value="RETRIAL">RETRIAL</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Mold Temp (°C)</label>
              <input
                type="number"
                value={newForm.moldTemperatureC}
                onChange={(e) => setNewForm({ ...newForm, moldTemperatureC: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Inj Pressure (bar)</label>
              <input
                type="number"
                value={newForm.injectionPressureBar}
                onChange={(e) => setNewForm({ ...newForm, injectionPressureBar: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Cycle Time (s)</label>
              <input
                type="number"
                value={newForm.cycleTimeSeconds}
                onChange={(e) => setNewForm({ ...newForm, cycleTimeSeconds: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Good Parts</label>
              <input
                type="number"
                value={newForm.goodParts}
                onChange={(e) => setNewForm({ ...newForm, goodParts: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Rejected Parts</label>
              <input
                type="number"
                value={newForm.rejectedParts}
                onChange={(e) => setNewForm({ ...newForm, rejectedParts: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Defects Observed (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. Flash at parting line, Sink mark on rib"
              value={newForm.defectsObserved}
              onChange={(e) => setNewForm({ ...newForm, defectsObserved: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Evaluation Result</label>
            <select
              value={newForm.result}
              onChange={(e) => setNewForm({ ...newForm, result: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs font-semibold"
            >
              <option value="PASS">PASS (Ready for production)</option>
              <option value="FAIL">FAIL (Rework required)</option>
              <option value="CONDITIONAL">CONDITIONAL (Tuning required)</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button onClick={() => setIsNewModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">
              Cancel
            </button>
            <button
              onClick={() => createTrialMutation.mutate(newForm)}
              disabled={createTrialMutation.isPending}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
            >
              {createTrialMutation.isPending ? 'Saving...' : 'Save Trial Observation'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Retrial Request Modal */}
      <Modal isOpen={isRetrialModalOpen} onClose={() => setIsRetrialModalOpen(false)} title="Request Governed Retrial">
        <div className="space-y-4 text-sm text-slate-200">
          <p className="text-xs text-slate-400">
            Initiate a governed Retrial (T{selectedTrial?.trialSequence ?? 1}) for trial{' '}
            <span className="font-semibold text-white">{selectedTrial?.trialNumber}</span>.
          </p>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Retrial Reason *</label>
            <input
              type="text"
              value={retrialReason}
              onChange={(e) => setRetrialReason(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tooling Changes / Machine Adjustments</label>
            <textarea
              value={retrialChanges}
              onChange={(e) => setRetrialChanges(e.target.value)}
              placeholder="e.g. Polished core cavity, modified cooling channel flow..."
              className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs h-20"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button onClick={() => setIsRetrialModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">
              Cancel
            </button>
            <button
              onClick={() =>
                requestRetrialMutation.mutate({
                  id: selectedTrial?.id,
                  reason: retrialReason,
                  changes: retrialChanges,
                })
              }
              disabled={requestRetrialMutation.isPending || !retrialReason}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
            >
              {requestRetrialMutation.isPending ? 'Requesting...' : 'Submit Retrial Request'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ECR Creation Modal */}
      <Modal isOpen={isEcrModalOpen} onClose={() => setIsEcrModalOpen(false)} title="Create Tooling Change Request (ECR)">
        <div className="space-y-4 text-sm text-slate-200">
          <p className="text-xs text-slate-400">
            Create an Engineering Change Request from failed trial defects in{' '}
            <span className="font-semibold text-white">{selectedTrial?.trialNumber}</span>.
          </p>
          <div>
            <label className="block text-xs text-slate-400 mb-1">ECR Title</label>
            <input
              type="text"
              value={ecrTitle}
              onChange={(e) => setEcrTitle(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Remediation Reason / Plan</label>
            <textarea
              value={ecrReason}
              onChange={(e) => setEcrReason(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs h-20"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button onClick={() => setIsEcrModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">
              Cancel
            </button>
            <button
              onClick={() =>
                createEcrMutation.mutate({
                  id: selectedTrial?.id,
                  title: ecrTitle,
                  reason: ecrReason,
                })
              }
              disabled={createEcrMutation.isPending}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-amber-600 hover:bg-amber-500 text-white"
            >
              {createEcrMutation.isPending ? 'Creating...' : 'Create ECR'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
