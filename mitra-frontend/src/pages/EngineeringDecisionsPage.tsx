import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import {
  GitCommit, Plus, Search, AlertTriangle, ArrowRight,
  CornerDownRight, Send, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

const DECISION_TYPES = [
  'DESIGN', 'MATERIAL_SELECTION', 'PROCESS', 'ENGINEERING_CHANGE',
  'QUALITY', 'TRIAL', 'RELEASE', 'COST', 'SCHEDULE', 'OTHER',
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  SUBMITTED: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  REJECTED: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  SUPERSEDED: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  CANCELLED: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
};

export function EngineeringDecisionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [selectedDecision, setSelectedDecision] = useState<any>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSupersedeModal, setShowSupersedeModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const queryClient = useQueryClient();

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: decisionsData, isLoading, error } = useQuery({
    queryKey: ['engineering-decisions', search, statusFilter, typeFilter, projectFilter],
    queryFn: () =>
      api
        .get('/engineering-decisions', {
          params: {
            search: search || undefined,
            status: statusFilter || undefined,
            type: typeFilter || undefined,
            projectId: projectFilter || undefined,
            limit: 50,
          },
        })
        .then((r) => r.data),
    staleTime: 15_000,
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => api.get('/project', { params: { limit: 100 } }).then((r) => r.data),
    staleTime: 60_000,
  });

  // ── Forms ──────────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    title: '',
    projectId: '',
    decisionType: 'DESIGN',
    context: '',
    description: '',
    optionsConsidered: '',
    selectedOption: '',
    rationale: '',
    decision: '',
    decisionDate: new Date().toISOString().split('T')[0],
    relatedEntityType: '',
    relatedEntityId: '',
  });

  const [supersedeForm, setSupersedeForm] = useState({
    title: '',
    decisionType: 'DESIGN',
    context: '',
    description: '',
    optionsConsidered: '',
    selectedOption: '',
    rationale: '',
    decision: '',
    decisionDate: new Date().toISOString().split('T')[0],
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: any) => {
      const payload = { ...data, projectId: data.projectId || undefined };
      return api.post('/engineering-decisions', payload).then((r) => r.data);
    },
    onSuccess: () => {
      toast.success('Engineering decision logged');
      queryClient.invalidateQueries({ queryKey: ['engineering-decisions'] });
      setShowCreateModal(false);
      setForm({
        title: '',
        projectId: '',
        decisionType: 'DESIGN',
        context: '',
        description: '',
        optionsConsidered: '',
        selectedOption: '',
        rationale: '',
        decision: '',
        decisionDate: new Date().toISOString().split('T')[0],
        relatedEntityType: '',
        relatedEntityId: '',
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create engineering decision');
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => api.post(`/engineering-decisions/${id}/submit`).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(`Decision ${data.decisionNumber} submitted for review`);
      queryClient.invalidateQueries({ queryKey: ['engineering-decisions'] });
      if (selectedDecision?.id === data.id) setSelectedDecision(data);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to submit decision'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/engineering-decisions/${id}/approve`).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(`Decision ${data.decisionNumber} approved`);
      queryClient.invalidateQueries({ queryKey: ['engineering-decisions'] });
      if (selectedDecision?.id === data.id) setSelectedDecision(data);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to approve decision'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/engineering-decisions/${id}/reject`, { reason }).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(`Decision ${data.decisionNumber} rejected`);
      queryClient.invalidateQueries({ queryKey: ['engineering-decisions'] });
      setShowRejectModal(false);
      setRejectionReason('');
      if (selectedDecision?.id === data.id) setSelectedDecision(data);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to reject decision'),
  });

  const supersedeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.post(`/engineering-decisions/${id}/supersede`, data).then((r) => r.data),
    onSuccess: (res) => {
      toast.success(`Decision superseded. Successor: ${res.successor.decisionNumber}`);
      queryClient.invalidateQueries({ queryKey: ['engineering-decisions'] });
      setShowSupersedeModal(false);
      setShowDetailModal(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to supersede decision'),
  });

  const decisions = decisionsData?.data || [];
  const projects = projectsData?.data || [];

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'decisionNumber',
      header: 'Decision #',
      render: (d: any) => (
        <span className="font-mono font-bold text-accent" style={{ color: 'var(--color-accent)' }}>
          {d.decisionNumber}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Title & Summary',
      render: (d: any) => (
        <div>
          <div className="font-medium text-gray-100">{d.title}</div>
          {d.rationale && <div className="text-xs text-gray-400 truncate max-w-sm">{d.rationale}</div>}
        </div>
      ),
    },
    {
      key: 'decisionType',
      header: 'Type',
      render: (d: any) => (
        <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 border border-white/10">
          {d.decisionType}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (d: any) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
            STATUS_COLORS[d.status] || 'bg-gray-800 text-gray-400'
          }`}
        >
          {d.status}
        </span>
      ),
    },
    {
      key: 'decisionDate',
      header: 'Date',
      render: (d: any) => (d.decisionDate ? new Date(d.decisionDate).toLocaleDateString() : '—'),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (d: any) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedDecision(d);
              setShowDetailModal(true);
            }}
            className="px-2.5 py-1 text-xs rounded bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 transition-colors"
          >
            Review Details
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <GitCommit className="w-7 h-7 text-accent" style={{ color: 'var(--color-accent)' }} />
            Engineering Decision Log
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Auditable governance log of engineering decisions, technical rationales, and lifecycle traceability.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center gap-2 transition-colors shadow-sm font-semibold"
        >
          <Plus className="w-4 h-4" /> Log New Decision
        </button>
      </div>

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[240px] bg-slate-900/60 border border-white/10 rounded-lg px-3 py-1.5">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search decision #, title, rationale..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-0 text-sm text-gray-100 focus:outline-none w-full"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900/80 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">DRAFT</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="SUPERSEDED">SUPERSEDED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-900/80 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none"
              >
                <option value="">All Types</option>
                {DECISION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="bg-slate-900/80 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none max-w-[200px]"
              >
                <option value="">All Projects</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.projectCode || p.id}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Failed to load engineering decision log.
            </div>
          ) : (
            <DataTable columns={columns} data={decisions} loading={isLoading} />
          )}
        </CardContent>
      </Card>

      {/* Modal: Create Engineering Decision */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Record Engineering Decision">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(form);
          }}
          className="space-y-4 max-h-[75vh] overflow-y-auto pr-1"
        >
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Decision Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Conformal cooling vs Baffle circuit for Core Insert"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Decision Type *</label>
              <select
                value={form.decisionType}
                onChange={(e) => setForm({ ...form, decisionType: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
              >
                {DECISION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Associated Project</label>
              <select
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
              >
                <option value="">-- Master / Global Decision --</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.projectCode || p.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Background Context</label>
            <textarea
              rows={2}
              placeholder="Context and engineering requirements that prompted this decision..."
              value={form.context}
              onChange={(e) => setForm({ ...form, context: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Options Considered</label>
            <textarea
              rows={2}
              placeholder="Option 1: Standard Baffle ($1.2k, +4s cycle). Option 2: 3D DMLS Conformal ($3.8k, -6s cycle)..."
              value={form.optionsConsidered}
              onChange={(e) => setForm({ ...form, optionsConsidered: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Selected Option</label>
              <input
                type="text"
                placeholder="Option 2: 3D DMLS Conformal Cooling"
                value={form.selectedOption}
                onChange={(e) => setForm({ ...form, selectedOption: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Decision Date</label>
              <input
                type="date"
                value={form.decisionDate}
                onChange={(e) => setForm({ ...form, decisionDate: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Technical Rationale & Evidence</label>
            <textarea
              rows={2}
              placeholder="Thermal moldflow simulation shows hotspot eliminated with conformal layout..."
              value={form.rationale}
              onChange={(e) => setForm({ ...form, rationale: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Formal Decision Statement</label>
            <textarea
              rows={2}
              placeholder="Adopt 3D DMLS insert design for Cavity Insert Block A-04..."
              value={form.decision}
              onChange={(e) => setForm({ ...form, decision: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-xs font-medium rounded bg-white/5 hover:bg-white/10 text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 text-xs font-medium rounded bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
            >
              {createMutation.isPending ? 'Logging...' : 'Save Decision Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Decision Detail & Governance Action */}
      {selectedDecision && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Engineering Decision: ${selectedDecision.decisionNumber}`}
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-sm">
            {/* Header info */}
            <div className="p-3 bg-slate-900/90 rounded-lg border border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-100 text-base">{selectedDecision.title}</h3>
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-3">
                  <span>Type: <strong className="text-gray-200">{selectedDecision.decisionType}</strong></span>
                  <span>Date: <strong className="text-gray-200">{selectedDecision.decisionDate || '—'}</strong></span>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  STATUS_COLORS[selectedDecision.status] || 'bg-gray-800 text-gray-400'
                }`}
              >
                {selectedDecision.status}
              </span>
            </div>

            {/* Governance Q&A Structure */}
            <div className="space-y-3 p-4 bg-slate-900/50 rounded-lg border border-white/10">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">WHAT was decided?</span>
                <p className="text-gray-200 mt-1">{selectedDecision.decision || selectedDecision.selectedOption || '—'}</p>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">WHY was it decided? (Technical Rationale)</span>
                <p className="text-gray-200 mt-1">{selectedDecision.rationale || '—'}</p>
              </div>

              {selectedDecision.optionsConsidered && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent">Alternatives Considered</span>
                  <p className="text-gray-300 mt-1 whitespace-pre-line">{selectedDecision.optionsConsidered}</p>
                </div>
              )}

              {selectedDecision.context && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent">Background Context</span>
                  <p className="text-gray-300 mt-1">{selectedDecision.context}</p>
                </div>
              )}

              {selectedDecision.rejectionReason && (
                <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300">
                  <span className="font-semibold text-xs uppercase block">Rejection Reason:</span>
                  <p className="mt-0.5">{selectedDecision.rejectionReason}</p>
                </div>
              )}

              {selectedDecision.supersedesDecisionId && (
                <div className="text-xs text-purple-300 flex items-center gap-1.5 pt-1">
                  <CornerDownRight className="w-4 h-4" /> Supersedes prior decision record #{selectedDecision.supersedesDecisionId}
                </div>
              )}
            </div>

            {/* Governance Lifecycle Controls */}
            <div className="border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {selectedDecision.status === 'DRAFT' && (
                  <button
                    onClick={() => submitMutation.mutate(selectedDecision.id)}
                    disabled={submitMutation.isPending}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit for Review
                  </button>
                )}

                {selectedDecision.status === 'SUBMITTED' && (
                  <>
                    <button
                      onClick={() => approveMutation.mutate(selectedDecision.id)}
                      disabled={approveMutation.isPending}
                      className="px-3 py-1.5 text-xs font-semibold rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" /> Approve Decision
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="px-3 py-1.5 text-xs font-semibold rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 flex items-center gap-1.5"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" /> Reject
                    </button>
                  </>
                )}

                {['APPROVED', 'SUBMITTED', 'REJECTED'].includes(selectedDecision.status) && (
                  <button
                    onClick={() => {
                      setSupersedeForm({
                        title: `Revised: ${selectedDecision.title}`,
                        decisionType: selectedDecision.decisionType,
                        context: selectedDecision.context || '',
                        description: selectedDecision.description || '',
                        optionsConsidered: selectedDecision.optionsConsidered || '',
                        selectedOption: selectedDecision.selectedOption || '',
                        rationale: '',
                        decision: '',
                        decisionDate: new Date().toISOString().split('T')[0],
                      });
                      setShowSupersedeModal(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 flex items-center gap-1.5"
                  >
                    <ArrowRight className="w-3.5 h-3.5" /> Supersede Decision
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-1.5 text-xs font-medium rounded bg-white/5 hover:bg-white/10 text-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Reject Decision */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Engineering Decision">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!rejectionReason.trim()) return toast.error('Rejection reason required');
            rejectMutation.mutate({ id: selectedDecision.id, reason: rejectionReason });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Reason for Rejection *</label>
            <textarea
              rows={3}
              required
              placeholder="State technical, dimensional, or cost grounds for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowRejectModal(false)}
              className="px-4 py-2 text-xs font-medium rounded bg-white/5 hover:bg-white/10 text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rejectMutation.isPending}
              className="px-4 py-2 text-xs font-medium rounded bg-rose-500 hover:bg-rose-600 text-white font-semibold"
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Supersede Decision */}
      <Modal isOpen={showSupersedeModal} onClose={() => setShowSupersedeModal(false)} title="Supersede Decision with Successor">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            supersedeMutation.mutate({ id: selectedDecision.id, data: supersedeForm });
          }}
          className="space-y-4 max-h-[75vh] overflow-y-auto pr-1"
        >
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded text-xs text-purple-300">
            This will mark <strong>{selectedDecision?.decisionNumber}</strong> as SUPERSEDED and generate a new linked successor decision record atomically.
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Successor Decision Title *</label>
            <input
              type="text"
              required
              value={supersedeForm.title}
              onChange={(e) => setSupersedeForm({ ...supersedeForm, title: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">New Technical Rationale</label>
            <textarea
              rows={2}
              required
              placeholder="Why is the prior decision being superseded? (e.g. Trial 2 results showed excessive shrinkage)..."
              value={supersedeForm.rationale}
              onChange={(e) => setSupersedeForm({ ...supersedeForm, rationale: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">New Formal Decision Statement</label>
            <textarea
              rows={2}
              required
              placeholder="Revised decision statement..."
              value={supersedeForm.decision}
              onChange={(e) => setSupersedeForm({ ...supersedeForm, decision: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSupersedeModal(false)}
              className="px-4 py-2 text-xs font-medium rounded bg-white/5 hover:bg-white/10 text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={supersedeMutation.isPending}
              className="px-4 py-2 text-xs font-medium rounded bg-purple-500 hover:bg-purple-600 text-white font-semibold"
            >
              {supersedeMutation.isPending ? 'Superseding...' : 'Create Successor Decision'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
