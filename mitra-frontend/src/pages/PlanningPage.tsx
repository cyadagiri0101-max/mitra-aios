import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export function PlanningPage() {
  const [search, setSearch] = useState('');
  const { data: plans, isLoading, error } = useQuery({
    queryKey: ['process-plans'],
    queryFn: () => api.get('/planning/process-plans').then(r => { const p = r.data; return Array.isArray(p) ? p : (p?.data ?? []); }),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const filtered = plans?.filter((p: any) => p.planNumber?.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key: 'planNumber', header: 'Plan #' },
    { key: 'processName', header: 'Process' },
    { key: 'status', header: 'Status', render: (p: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        p.status === 'active' ? 'bg-green-100 text-green-800' : p.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{p.status}</span>
    )},
    { key: 'createdAt', header: 'Created', render: (p: any) => new Date(p.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Process Planning</h1>
        <button className="btn-primary" onClick={() => toast('Create plan — implement modal')}><Plus className="w-4 h-4 mr-2" /> New Plan</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Failed to load process plans.</div>}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search plans..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border-0 bg-transparent focus:ring-0 text-sm" />
          </div>
        </CardHeader>
        <CardContent><DataTable columns={columns} data={filtered || []} loading={isLoading} /></CardContent>
      </Card>
    </div>
  );
}
