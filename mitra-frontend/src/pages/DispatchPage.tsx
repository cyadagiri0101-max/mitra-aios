import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  PLANNING: 'bg-gray-100 text-gray-800',
  PACKED: 'bg-yellow-100 text-yellow-800',
  SHIPPED: 'bg-blue-100 text-blue-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export function DispatchPage() {
  const [search, setSearch] = useState('');
  const { data: plans, isLoading, error } = useQuery({
    queryKey: ['dispatch-plans'],
    queryFn: () => api.get('/dispatch').then(r => { const p = r.data; return Array.isArray(p) ? p : (p?.data ?? []); }),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const filtered = plans?.filter((p: any) => p.dispatchNumber?.toLowerCase().includes(search.toLowerCase()) || p.customerName?.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key: 'dispatchNumber', header: 'Dispatch #' },
    { key: 'customerName', header: 'Customer' },
    { key: 'status', header: 'Status', render: (p: any) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-800'}`}>{p.status}</span> },
    { key: 'carrier', header: 'Carrier', render: (p: any) => p.carrier ?? '—' },
    { key: 'plannedDate', header: 'Planned Date', render: (p: any) => p.plannedDate ? new Date(p.plannedDate).toLocaleDateString() : '—' },
    { key: 'shippedDate', header: 'Shipped', render: (p: any) => p.shippedDate ? new Date(p.shippedDate).toLocaleDateString() : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dispatch & Logistics</h1>
        <button className="btn-primary" onClick={() => toast('Create dispatch plan — implement modal')}><Plus className="w-4 h-4 mr-2" /> New Dispatch</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Failed to load dispatch plans.</div>}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Dispatch Plans</CardTitle>
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search dispatch plans…" value={search} onChange={e => setSearch(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-64 focus:ring-2 focus:ring-mitra-500 focus:border-mitra-500 outline-none" />
            </div>
          </div>
        </CardHeader>
        <CardContent><DataTable columns={columns} data={filtered ?? []} loading={isLoading} /></CardContent>
      </Card>
    </div>
  );
}
