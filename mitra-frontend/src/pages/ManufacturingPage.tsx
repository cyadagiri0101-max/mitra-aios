import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export function ManufacturingPage() {
  const [search, setSearch] = useState('');
  const { data: workOrders, isLoading, error } = useQuery({
    queryKey: ['work-orders'],
    queryFn: () => api.get('/manufacturing/work-orders').then(r => { const p = r.data; return Array.isArray(p) ? p : (p?.data ?? []); }),
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });

  const filtered = workOrders?.filter((w: any) => w.workOrderNumber?.toLowerCase().includes(search.toLowerCase()));
  const totalOrders = workOrders?.length ?? 0;
  const statusCounts = workOrders?.reduce((acc: Record<string, number>, workOrder: any) => {
    const status = workOrder.status ?? 'other';
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {}) ?? {};

  const columns = [
    { key: 'workOrderNumber', header: 'WO #' },
    { key: 'status', header: 'Status', render: (w: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        w.status === 'completed' ? 'bg-emerald-500/10 text-emerald-200' : w.status === 'in_progress' ? 'bg-cyan-500/10 text-cyan-200' :
        w.status === 'released' ? 'bg-amber-500/10 text-amber-200' : 'bg-slate-700/90 text-slate-200'}`}>{w.status?.replace(/_/g, ' ')}</span>
    )},
    { key: 'plannedStartDate', header: 'Planned Start', render: (w: any) => w.plannedStartDate ? new Date(w.plannedStartDate).toLocaleDateString() : '-' },
    { key: 'actualStartDate', header: 'Actual Start', render: (w: any) => w.actualStartDate ? new Date(w.actualStartDate).toLocaleDateString() : '-' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Manufacturing</h1>
          <p className="mt-2 text-sm text-slate-400">Track work orders and machine readiness across the shop floor.</p>
        </div>
        <button className="btn-primary" onClick={() => toast('Create work order — implement modal')}><Plus className="w-4 h-4 mr-2" /> New Work Order</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-4">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Total orders</p>
          <p className="mt-3 text-3xl font-semibold text-white">{totalOrders}</p>
        </div>
        {['completed', 'in_progress', 'released'].map((status) => (
          <div key={status} className="rounded-3xl border border-white/10 bg-slate-950/75 p-4">
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">{status.replace(/_/g, ' ')}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{statusCounts[status] ?? 0}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100 shadow-sm shadow-rose-500/10" role="status" aria-live="polite">
          <div className="inline-flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-200" />
            <p>Failed to load work orders. Please refresh the page or try again later.</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="px-6 py-4">
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              aria-label="Search work orders"
              placeholder="Search work orders..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 input-field bg-slate-950/70 border-white/10 text-slate-100"
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filtered || []} loading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
