import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export function TrialsPage() {
  const [search, setSearch] = useState('');
  const { data: reports, isLoading, error } = useQuery({
    queryKey: ['trial-reports'],
    queryFn: () => api.get('/quality/trials').then(r => { const p = r.data; return Array.isArray(p) ? p : (p?.data ?? []); }),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const filtered = reports?.filter((r: any) => r.reportNumber?.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key: 'reportNumber', header: 'Report #' },
    { key: 'trialType', header: 'Type' },
    { key: 'status', header: 'Status', render: (r: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        r.status === 'completed' ? 'bg-green-100 text-green-800' : r.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
        r.status === 'needs_rework' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{r.status}</span>
    )},
    { key: 'trialDate', header: 'Date', render: (r: any) => r.trialDate ? new Date(r.trialDate).toLocaleDateString() : '-' },
    { key: 'successRate', header: 'Success %', render: (r: any) => r.successRate ? `${r.successRate}%` : '-' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Trial Reports</h1>
        <button className="btn-primary" onClick={() => toast('Create trial — implement modal')}><Plus className="w-4 h-4 mr-2" /> New Trial</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Failed to load trial reports.</div>}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search trials..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border-0 bg-transparent focus:ring-0 text-sm" />
          </div>
        </CardHeader>
        <CardContent><DataTable columns={columns} data={filtered || []} loading={isLoading} /></CardContent>
      </Card>
    </div>
  );
}
