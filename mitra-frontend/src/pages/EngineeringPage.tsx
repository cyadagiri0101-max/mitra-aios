import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Plus, GitBranch, Scale, Network, Inbox, Users, ListTree, Workflow, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const unwrap = (r: any) => {
  const p = r.data;
  return Array.isArray(p) ? p : (p?.data ?? []);
};

type TabKey = 'boms' | 'routings' | 'reviews' | 'uoms' | 'trace' | 'outbox';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'boms', label: 'BOMs & Substitutions', icon: <ListTree className="w-4 h-4" /> },
  { key: 'routings', label: 'Routings & Revisions', icon: <Workflow className="w-4 h-4" /> },
  { key: 'reviews', label: 'Reviews & Assignments', icon: <Users className="w-4 h-4" /> },
  { key: 'uoms', label: 'Unit Conversions', icon: <Scale className="w-4 h-4" /> },
  { key: 'trace', label: 'Traceability', icon: <Network className="w-4 h-4" /> },
  { key: 'outbox', label: 'Outbox Relay', icon: <Inbox className="w-4 h-4" /> },
];

export function EngineeringPage() {
  const [tab, setTab] = useState<TabKey>('boms');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Engineering</h1>
          <p className="text-sm text-slate-400 mt-1">BOMs, routings, reviews, conversions, traceability &amp; outbox — Sprint 2.3.1</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'bg-slate-900 text-slate-300 border border-white/10 hover:bg-slate-800'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'boms' && <BomsTab />}
      {tab === 'routings' && <RoutingsTab />}
      {tab === 'reviews' && <ReviewsTab />}
      {tab === 'uoms' && <UomsTab />}
      {tab === 'trace' && <TraceTab />}
      {tab === 'outbox' && <OutboxTab />}
    </div>
  );
}

/* ── BOMs & Substitutions ─────────────────────────────────────────────── */

function BomsTab() {
  const queryClient = useQueryClient();
  const [selectedBomId, setSelectedBomId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [compareRev, setCompareRev] = useState<{ a: string; b: string } | null>(null);
  const [subModal, setSubModal] = useState(false);
  const [subForm, setSubForm] = useState({ substituteBomItemId: '', type: 'ALTERNATE', reason: '', priority: 'MEDIUM' });

  const { data: boms, isLoading } = useQuery({
    queryKey: ['eng-boms'],
    queryFn: () => api.get('/engineering/boms?page=1&limit=50').then(unwrap),
    staleTime: 2 * 60 * 1000,
  });

  const { data: tree } = useQuery({
    queryKey: ['eng-bom-tree', selectedBomId],
    queryFn: () => api.get(`/engineering/boms/${selectedBomId}/tree`).then((r: any) => r.data),
    enabled: !!selectedBomId,
    staleTime: 60 * 1000,
  });

  const { data: bomRevisions } = useQuery({
    queryKey: ['eng-bom-revisions', selectedBomId],
    queryFn: () => api.get(`/engineering/boms/${selectedBomId}/revisions`).then(unwrap),
    enabled: !!selectedBomId,
    staleTime: 30 * 1000,
  });

  const { data: bomDiff } = useQuery({
    queryKey: ['eng-bom-diff', selectedBomId, compareRev],
    queryFn: () => api.get(`/engineering/boms/${selectedBomId}/compare/${compareRev!.a}/${compareRev!.b}`).then((r: any) => r.data),
    enabled: !!selectedBomId && !!compareRev,
    staleTime: 30 * 1000,
  });

  const { data: bomImpact } = useQuery({
    queryKey: ['eng-bom-impact', selectedBomId, compareRev?.b],
    queryFn: () => api.get(`/engineering/traceability/revision-impact?entityType=BOM&entityId=${selectedBomId}&revision=${compareRev?.b ?? 'A'}`).then((r: any) => r.data),
    enabled: !!selectedBomId && !!compareRev,
    staleTime: 30 * 1000,
  });

  const createBomRev = useMutation({
    mutationFn: () => api.post(`/engineering/boms/${selectedBomId}/revisions`, { bumpRevision: true, changeSummary: 'New revision from UI' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eng-bom-revisions'] });
      queryClient.invalidateQueries({ queryKey: ['eng-boms'] });
      toast.success('BOM revision created');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create BOM revision'),
  });

  const items = selectedItemId
    ? (tree?.flatMap((n: any) => (n.item?.id === selectedItemId ? [{ ...n.item, children: n.children ?? [] }] : [])) ?? [])
    : (tree ?? []);

  const { data: substitutions } = useQuery({
    queryKey: ['eng-substitutions', selectedBomId, selectedItemId],
    queryFn: () => api.get(`/engineering/boms/${selectedBomId}/substitutions${selectedItemId ? `?itemId=${selectedItemId}` : ''}`).then(unwrap),
    enabled: !!selectedBomId,
    staleTime: 60 * 1000,
  });

  const addSub = useMutation({
    mutationFn: (d: typeof subForm) => api.post(`/engineering/boms/${selectedBomId}/items/${selectedItemId}/substitutions`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eng-substitutions'] });
      toast.success('Substitution added');
      setSubModal(false);
      setSubForm({ substituteBomItemId: '', type: 'ALTERNATE', reason: '', priority: 'MEDIUM' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to add substitution'),
  });

  const removeSub = useMutation({
    mutationFn: (subId: string) => api.delete(`/engineering/boms/${selectedBomId}/items/${selectedItemId}/substitutions/${subId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eng-substitutions'] });
      toast.success('Substitution removed');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to remove substitution'),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>BOMs &amp; Revisions</CardTitle>
          {selectedBomId && (
            <button
              onClick={() => createBomRev.mutate()}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-sm font-medium"
            >
              <GitBranch className="w-4 h-4" /> Bump Revision
            </button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <DataTable
            loading={isLoading}
            data={boms ?? []}
            onRowClick={(b: any) => { setSelectedBomId(b.id); setSelectedItemId(null); setCompareRev(null); }}
            columns={[
              { key: 'bomNumber', header: 'BOM #' },
              { key: 'name', header: 'Name' },
              { key: 'revision', header: 'Rev' },
              { key: 'status', header: 'Status', render: (b: any) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  b.status === 'RELEASED' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'
                }`}>{b.status}</span>
              )},
            ]}
          />

          {bomRevisions && bomRevisions.length > 1 && (
            <div className="pt-2 border-t border-white/10 space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Revision History &amp; Comparison</h4>
              <div className="flex gap-2">
                <select
                  aria-label="Compare baseline revision"
                  className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                  value={compareRev?.a ?? bomRevisions[1]?.revision ?? 'A'}
                  onChange={(e) => setCompareRev({ a: e.target.value, b: compareRev?.b ?? bomRevisions[0]?.revision ?? 'B' })}
                >
                  {bomRevisions.map((r: any) => <option key={r.id} value={r.revision}>Rev {r.revision} (v{r.versionNumber})</option>)}
                </select>
                <span className="text-slate-400 text-xs self-center">vs</span>
                <select
                  aria-label="Compare target revision"
                  className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                  value={compareRev?.b ?? bomRevisions[0]?.revision ?? 'B'}
                  onChange={(e) => setCompareRev({ a: compareRev?.a ?? bomRevisions[1]?.revision ?? 'A', b: e.target.value })}
                >
                  {bomRevisions.map((r: any) => <option key={r.id} value={r.revision}>Rev {r.revision} (v{r.versionNumber})</option>)}
                </select>
              </div>

              {bomDiff && (
                <div className="p-3 bg-slate-900 border border-white/10 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-medium">Added: +{bomDiff.added ?? 0}</span>
                    <span className="text-red-400 font-medium">Removed: -{bomDiff.removed ?? 0}</span>
                    <span className="text-amber-400 font-medium">Changed: ~{bomDiff.changed ?? 0}</span>
                  </div>
                  {bomImpact && (
                    <div className="text-slate-400 border-t border-white/5 pt-2">
                      <span>Impact: </span>
                      <span className="text-cyan-300 font-medium">{bomImpact.impact?.workOrdersCount ?? 0} Work Orders</span>,{' '}
                      <span className="text-cyan-300 font-medium">{bomImpact.impact?.jobCardsCount ?? 0} Job Cards</span>,{' '}
                      <span className="text-cyan-300 font-medium">{bomImpact.impact?.inspectionPlansCount ?? 0} Quality Plans</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{selectedItemId ? 'Substitutions' : 'BOM Items — select an item to manage substitutions'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DataTable
            data={items}
            loading={!tree && !!selectedBomId}
            onRowClick={(it: any) => setSelectedItemId(it.id)}
            columns={[
              { key: 'position', header: 'Pos' },
              { key: 'partNumber', header: 'Part #', render: (it: any) => it.item?.partNumber ?? it.partNumber ?? '—' },
              { key: 'partName', header: 'Part Name', render: (it: any) => it.item?.partName ?? it.partName ?? '—' },
              { key: 'quantity', header: 'Qty' },
              { key: 'status', header: 'Status', render: (it: any) => it.status ?? '—' },
            ]}
          />
          {selectedItemId && (
            <div className="space-y-3">
              <button
                onClick={() => setSubModal(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Add substitution
              </button>
              <DataTable
                data={substitutions ?? []}
                columns={[
                  { key: 'substituteBomItemId', header: 'Substitute Item', render: (s: any) => s.substituteItem?.partNumber ?? s.substituteBomItemId },
                  { key: 'type', header: 'Type' },
                  { key: 'status', header: 'Status', render: (s: any) => (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      s.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-300' : s.status === 'REJECTED' ? 'bg-red-500/10 text-red-300' : 'bg-amber-500/10 text-amber-300'
                    }`}>{s.status}</span>
                  )},
                  { key: 'priority', header: 'Priority' },
                  { key: 'actions', header: '', render: (s: any) => (
                    <button onClick={() => removeSub.mutate(s.id)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                  )},
                ]}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={subModal} onClose={() => setSubModal(false)} title="Add substitution">
        <form onSubmit={(e) => { e.preventDefault(); addSub.mutate(subForm); }} className="space-y-4">
          <input
            placeholder="Substitute BOM item ID"
            value={subForm.substituteBomItemId}
            onChange={(e) => setSubForm({ ...subForm, substituteBomItemId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm"
            required
          />
          <select value={subForm.type} onChange={(e) => setSubForm({ ...subForm, type: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm">
            <option value="ALTERNATE">ALTERNATE</option>
            <option value="REPLACEMENT">REPLACEMENT</option>
            <option value="SUBSTITUTE">SUBSTITUTE</option>
            <option value="EQUIVALENT">EQUIVALENT</option>
          </select>
          <input
            placeholder="Reason"
            value={subForm.reason}
            onChange={(e) => setSubForm({ ...subForm, reason: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm"
          />
          <button type="submit" className="w-full px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm">Save</button>
        </form>
      </Modal>
    </div>
  );
}

/* ── Routings & Revisions ─────────────────────────────────────────────── */

function RoutingsTab() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compare, setCompare] = useState<{ a: string; b: string } | null>(null);

  const { data: routings, isLoading } = useQuery({
    queryKey: ['eng-routings'],
    queryFn: () => api.get('/engineering/routings?page=1&limit=50').then(unwrap),
    staleTime: 2 * 60 * 1000,
  });

  const { data: detail } = useQuery({
    queryKey: ['eng-routing-detail', selectedId],
    queryFn: () => api.get(`/engineering/routings/${selectedId}/with-operations`).then((r: any) => r.data),
    enabled: !!selectedId,
    staleTime: 60 * 1000,
  });

  const { data: revisions } = useQuery({
    queryKey: ['eng-routing-revisions', selectedId],
    queryFn: () => api.get(`/engineering/routings/${selectedId}/revisions`).then(unwrap),
    enabled: !!selectedId,
    staleTime: 30 * 1000,
  });

  const { data: diff } = useQuery({
    queryKey: ['eng-routing-diff', selectedId, compare],
    queryFn: () => api.get(`/engineering/routings/${selectedId}/revisions/compare/${compare!.a}/${compare!.b}`).then((r: any) => r.data),
    enabled: !!selectedId && !!compare,
    staleTime: 30 * 1000,
  });

  const createRevision = useMutation({
    mutationFn: () => api.post(`/engineering/routings/${selectedId}/revisions`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eng-routing-revisions'] });
      queryClient.invalidateQueries({ queryKey: ['eng-routings'] });
      toast.success('Revision snapshot created');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create revision'),
  });

  const ops = Array.isArray(detail) ? detail : (detail?.operations ?? detail?.routing?.operations ?? []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle>Routings</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            loading={isLoading}
            data={routings ?? []}
            onRowClick={(r: any) => setSelectedId(r.id)}
            columns={[
              { key: 'routingNumber', header: 'Routing #', render: (r: any) => r.routingNumber ?? r.name ?? r.id },
              { key: 'name', header: 'Name' },
              { key: 'version', header: 'Ver' },
              { key: 'status', header: 'Status', render: (r: any) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  r.status === 'RELEASED' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'
                }`}>{r.status}</span>
              )},
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Operations &amp; Revisions {selectedId ? `(${selectedId.slice(0, 8)}…)` : ''}</CardTitle>
          {selectedId && (
            <button
              onClick={() => createRevision.mutate()}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-sm font-medium"
            >
              <GitBranch className="w-4 h-4" /> Snapshot revision
            </button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <DataTable
            data={ops}
            loading={!!selectedId && !detail}
            columns={[
              { key: 'operationNumber', header: 'Op #', render: (o: any) => o.operationNumber ?? o.opNumber ?? o.position ?? '—' },
              { key: 'operationName', header: 'Operation', render: (o: any) => o.operationName ?? o.name ?? '—' },
              { key: 'workCenter', header: 'Work Center', render: (o: any) => o.workCenterName ?? o.workCenterId ?? '—' },
              { key: 'predecessorOperationId', header: 'Predecessor', render: (o: any) => o.predecessorOperationId ? '✓' : '—' },
              { key: 'cycleTimeSeconds', header: 'Cycle (s)' },
            ]}
          />
          {revisions && revisions.length > 0 && (
            <div className="pt-2 border-t border-white/10 space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Revision History &amp; Diff</h4>
              <DataTable
                data={revisions}
                columns={[
                  { key: 'version', header: 'Version' },
                  { key: 'createdAt', header: 'Snapshot date', render: (r: any) => new Date(r.createdAt).toLocaleString() },
                  { key: 'compare', header: '', render: (r: any) => (
                    <button
                      onClick={() => setCompare(compare?.b === String(r.version) ? null : { a: compare?.a ?? String(r.version), b: String(r.version) })}
                      className="text-cyan-400 hover:text-cyan-300 text-xs font-medium"
                    >
                      {compare?.b === String(r.version) ? 'Clear' : 'Compare vs current'}
                    </button>
                  )},
                ]}
              />
              {diff && (
                <div className="p-3 bg-slate-900 border border-white/10 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-medium">Added Operations: +{diff.added ?? 0}</span>
                    <span className="text-red-400 font-medium">Removed: -{diff.removed ?? 0}</span>
                    <span className="text-amber-400 font-medium">Changed: ~{diff.changed ?? 0}</span>
                  </div>
                  {diff.operations?.changed && diff.operations.changed.length > 0 && (
                    <div className="text-slate-400 space-y-1">
                      {diff.operations.changed.map((c: any, idx: number) => (
                        <div key={idx} className="font-mono text-[11px] text-amber-300">
                          Op {c.operation?.operationNumber ?? '—'} ({c.operation?.operationCode ?? ''}): Changed [{c.fields?.join(', ')}]
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Reviews & Assignments ────────────────────────────────────────────── */

function ReviewsTab() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assignModal, setAssignModal] = useState(false);
  const [assignee, setAssignee] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [reviewRole, setReviewRole] = useState('REVIEWER');
  const [decideTarget, setDecideTarget] = useState<{ assigneeId: string; status: string } | null>(null);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['eng-reviews'],
    queryFn: () => api.get('/engineering/reviews?page=1&limit=50').then(unwrap),
    staleTime: 2 * 60 * 1000,
  });

  const { data: assignments } = useQuery({
    queryKey: ['eng-assignments', selectedId],
    queryFn: () => api.get(`/engineering/reviews/${selectedId}/assignments`).then(unwrap),
    enabled: !!selectedId,
    staleTime: 30 * 1000,
  });

  const assign = useMutation({
    mutationFn: () => api.post(`/engineering/reviews/${selectedId}/assignments`, { assignees: [{ assigneeId: assignee, assigneeName: assigneeName || undefined, reviewRole }] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eng-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['eng-reviews'] });
      toast.success('Reviewer assigned');
      setAssignModal(false);
      setAssignee('');
      setAssigneeName('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to assign reviewer'),
  });

  const decide = useMutation({
    mutationFn: (status: string) => api.post(`/engineering/reviews/${selectedId}/assignments/${decideTarget!.assigneeId}/decide`, { decision: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eng-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['eng-reviews'] });
      toast.success('Decision recorded');
      setDecideTarget(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to record decision'),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle>Review Requests</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            loading={isLoading}
            data={reviews ?? []}
            onRowClick={(r: any) => setSelectedId(r.id)}
            columns={[
              { key: 'reviewNumber', header: 'Review #', render: (r: any) => r.reviewNumber ?? r.reviewType ?? r.id },
              { key: 'reviewType', header: 'Type', render: (r: any) => r.reviewType ?? '—' },
              { key: 'status', header: 'Status', render: (r: any) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  r.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-300' : r.status === 'REJECTED' ? 'bg-red-500/10 text-red-300' : r.status === 'CHANGES_REQUIRED' ? 'bg-amber-500/10 text-amber-300' : 'bg-slate-700 text-slate-300'
                }`}>{r.status}</span>
              )},
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Assignments {selectedId ? `(${selectedId.slice(0, 8)}…)` : '— select a review'}</CardTitle>
          {selectedId && (
            <button onClick={() => setAssignModal(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-sm font-medium">
              <Plus className="w-4 h-4" /> Assign reviewer
            </button>
          )}
        </CardHeader>
        <CardContent>
          <DataTable
            data={assignments ?? []}
            loading={!!selectedId && !assignments}
            columns={[
              { key: 'assigneeId', header: 'Assignee', render: (a: any) => a.assigneeName ?? a.assigneeId },
              { key: 'reviewRole', header: 'Role' },
              { key: 'status', header: 'Status', render: (a: any) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  a.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-300' : a.status === 'REJECTED' ? 'bg-red-500/10 text-red-300' : 'bg-amber-500/10 text-amber-300'
                }`}>{a.status}</span>
              )},
              { key: 'actions', header: '', render: (a: any) => (
                a.status === 'PENDING' || a.status === 'IN_PROGRESS' ? (
                  <div className="flex gap-1">
                    <button onClick={() => { setDecideTarget({ assigneeId: a.assigneeId, status: 'APPROVED' }); }} className="text-emerald-400 hover:text-emerald-300 text-xs">Approve</button>
                    <button onClick={() => { setDecideTarget({ assigneeId: a.assigneeId, status: 'REJECTED' }); }} className="text-red-400 hover:text-red-300 text-xs">Reject</button>
                  </div>
                ) : null
              )},
            ]}
          />
        </CardContent>
      </Card>

      <Modal isOpen={assignModal} onClose={() => setAssignModal(false)} title="Assign reviewer">
        <form onSubmit={(e) => { e.preventDefault(); assign.mutate(); }} className="space-y-4">
          <input
            placeholder="Assignee user ID"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm"
            required
          />
          <input
            placeholder="Assignee name (optional)"
            value={assigneeName}
            onChange={(e) => setAssigneeName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm"
          />
          <select value={reviewRole} onChange={(e) => setReviewRole(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm">
            <option value="REVIEWER">REVIEWER</option>
            <option value="APPROVER">APPROVER</option>
            <option value="OBSERVER">OBSERVER</option>
          </select>
          <button type="submit" className="w-full px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm">Assign</button>
        </form>
      </Modal>

      <Modal isOpen={!!decideTarget} onClose={() => setDecideTarget(null)} title={`Record decision — ${decideTarget?.status ?? ''}`}>
        <p className="text-sm text-slate-300 mb-4">
          Confirm decision for assignee {decideTarget?.assigneeId} on review {selectedId?.slice(0, 8)}…
        </p>
        <div className="flex gap-2">
          <button onClick={() => decide.mutate('APPROVED')} className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-medium text-sm">Approve</button>
          <button onClick={() => decide.mutate('REJECTED')} className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white font-medium text-sm">Reject</button>
          <button onClick={() => decide.mutate('CHANGES_REQUIRED')} className="flex-1 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-medium text-sm">Changes</button>
        </div>
      </Modal>
    </div>
  );
}

/* ── Unit Conversions ─────────────────────────────────────────────────── */

function UomsTab() {
  const queryClient = useQueryClient();
  const [value, setValue] = useState('1');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [newForm, setNewForm] = useState({ fromUom: '', toUom: '', conversionFactor: '' });
  const [createOpen, setCreateOpen] = useState(false);

  const { data: uoms, isLoading } = useQuery({
    queryKey: ['eng-uoms'],
    queryFn: () => api.get('/engineering/uoms?page=1&limit=100').then(unwrap),
    staleTime: 5 * 60 * 1000,
  });

  const { data: result, refetch, isFetching } = useQuery({
    queryKey: ['eng-uom-convert', from, to, value],
    queryFn: () => api.get(`/engineering/uoms/convert?value=${value}&from=${from}&to=${to}`).then((r: any) => r.data),
    enabled: false,
  });

  const create = useMutation({
    mutationFn: () => api.post('/engineering/uoms', { ...newForm, conversionFactor: Number(newForm.conversionFactor) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eng-uoms'] });
      toast.success('Conversion created');
      setCreateOpen(false);
      setNewForm({ fromUom: '', toUom: '', conversionFactor: '' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create conversion'),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Converter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <input value={value} onChange={(e) => setValue(e.target.value)} type="number" step="any" placeholder="Value"
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm" />
            <select value={from} onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm">
              <option value="">From…</option>
              {(uoms ?? []).map((u: any) => <option key={`f-${u.fromUom}-${u.toUom}`} value={u.fromUom}>{u.fromUom}</option>)}
            </select>
            <select value={to} onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm">
              <option value="">To…</option>
              {(uoms ?? []).map((u: any) => <option key={`t-${u.fromUom}-${u.toUom}`} value={u.toUom}>{u.toUom}</option>)}
            </select>
          </div>
          <button onClick={() => refetch()} disabled={!from || !to || isFetching}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm disabled:opacity-50">
            <Scale className="w-4 h-4" /> Convert
          </button>
          {result && (
            <div className="p-4 rounded-xl bg-slate-900 border border-cyan-400/30">
              <p className="text-2xl font-bold text-cyan-300">
                {value} {from} = {typeof result === 'object' ? (result.result ?? result.value ?? JSON.stringify(result)) : result} {to}
              </p>
              {typeof result === 'object' && result.resolvedType && (
                <p className="text-xs text-slate-400 mt-1">Resolved via: {result.resolvedType}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Conversion table</CardTitle>
          <button onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-sm font-medium">
            <Plus className="w-4 h-4" /> Add
          </button>
        </CardHeader>
        <CardContent>
          <DataTable
            loading={isLoading}
            data={uoms ?? []}
            columns={[
              { key: 'fromUom', header: 'From' },
              { key: 'toUom', header: 'To' },
              { key: 'conversionFactor', header: 'Factor' },
              { key: 'type', header: 'Type' },
              { key: 'isDefault', header: 'Scope', render: (u: any) => u.tenantId ? 'Tenant' : 'Global' },
            ]}
          />
        </CardContent>
      </Card>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add conversion">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
          <input placeholder="From UoM (e.g. mm)" value={newForm.fromUom} onChange={(e) => setNewForm({ ...newForm, fromUom: e.target.value.toUpperCase() })}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm" required />
          <input placeholder="To UoM (e.g. cm)" value={newForm.toUom} onChange={(e) => setNewForm({ ...newForm, toUom: e.target.value.toUpperCase() })}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm" required />
          <input placeholder="Conversion factor" type="number" step="any" value={newForm.conversionFactor}
            onChange={(e) => setNewForm({ ...newForm, conversionFactor: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm" required />
          <button type="submit" className="w-full px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm">Save</button>
        </form>
      </Modal>
    </div>
  );
}

/* ── Traceability ─────────────────────────────────────────────────────── */

function TraceTab() {
  const [entityType, setEntityType] = useState('drawing');
  const [entityId, setEntityId] = useState('');

  const { data: result, refetch, isFetching } = useQuery({
    queryKey: ['eng-trace', entityType, entityId],
    queryFn: () => api.get(`/engineering/traceability/entity?entityType=${entityType}&entityId=${entityId}`).then((r: any) => r.data),
    enabled: false,
  });

  return (
    <Card>
      <CardHeader><CardTitle>Entity trace</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm">
            <option value="drawing">Drawing</option>
            <option value="bom">BOM</option>
            <option value="bom_item">BOM item</option>
            <option value="routing">Routing</option>
            <option value="ecr">ECR</option>
            <option value="work_order">Work order</option>
          </select>
          <input value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="Entity UUID"
            className="col-span-2 px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm" />
        </div>
        <button onClick={() => refetch()} disabled={!entityId || isFetching}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm disabled:opacity-50">
          <Network className="w-4 h-4" /> Trace
        </button>
        {result && (
          <pre className="text-xs text-slate-300 bg-slate-900 border border-white/10 rounded-xl p-3 overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Outbox Relay ─────────────────────────────────────────────────────── */

function OutboxTab() {
  const queryClient = useQueryClient();

  const { data: rows, isLoading } = useQuery({
    queryKey: ['eng-outbox'],
    queryFn: () => api.get('/engineering/outbox?page=1&limit=20').then(unwrap),
    staleTime: 15 * 1000,
  });

  const relay = useMutation({
    mutationFn: () => api.post('/engineering/outbox/relay?maxRows=50'),
    onSuccess: (r: any) => {
      queryClient.invalidateQueries({ queryKey: ['eng-outbox'] });
      toast.success(`Relay done: ${typeof r.data === 'object' ? (r.data.relayed ?? JSON.stringify(r.data)) : r.data}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Relay failed'),
  });

  const retry = useMutation({
    mutationFn: () => api.post('/engineering/outbox/retry?maxRows=50'),
    onSuccess: (r: any) => {
      queryClient.invalidateQueries({ queryKey: ['eng-outbox'] });
      toast.success(`Retry done: ${typeof r.data === 'object' ? (r.data.relayed ?? JSON.stringify(r.data)) : r.data}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Retry failed'),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Domain outbox — pending integration events</CardTitle>
        <div className="flex gap-2">
          <button onClick={() => relay.mutate()} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-sm font-medium">
            <RefreshCw className="w-4 h-4" /> Relay
          </button>
          <button onClick={() => retry.mutate()} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/40 text-sm font-medium">
            <RefreshCw className="w-4 h-4" /> Retry failed
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          loading={isLoading}
          data={rows ?? []}
          columns={[
            { key: 'eventType', header: 'Event', render: (o: any) => (
              <span className="font-mono text-xs text-cyan-300">{o.eventType}</span>
            )},
            { key: 'aggregateType', header: 'Aggregate' },
            { key: 'aggregateId', header: 'Aggregate ID', render: (o: any) => o.aggregateId?.slice(0, 8) ?? '—' },
            { key: 'status', header: 'Status', render: (o: any) => (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                o.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-300' : o.status === 'FAILED' ? 'bg-red-500/10 text-red-300' : o.status === 'PROCESSING' ? 'bg-cyan-500/10 text-cyan-300' : 'bg-amber-500/10 text-amber-300'
              }`}>{o.status}</span>
            )},
            { key: 'attemptCount', header: 'Attempts' },
            { key: 'createdAt', header: 'Created', render: (o: any) => new Date(o.createdAt).toLocaleString() },
          ]}
        />
      </CardContent>
    </Card>
  );
}
