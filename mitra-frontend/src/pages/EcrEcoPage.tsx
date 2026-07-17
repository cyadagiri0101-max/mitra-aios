import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export function EcrEcoPage() {
  const [search, setSearch] = useState('');
  const { data: ecrs, isLoading, error } = useQuery({
    queryKey: ['ecrs'],
    queryFn: () => api.get('/ecr-eco/ecrs').then(r => { const p = r.data; return Array.isArray(p) ? p : (p?.data ?? []); }),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const filtered = ecrs?.filter((e: any) => e.ecrNumber?.toLowerCase().includes(search.toLowerCase()) || e.title?.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key: 'ecrNumber', header: 'ECR #' },
    { key: 'title', header: 'Title' },
    { key: 'reason', header: 'Reason' },
    { key: 'status', header: 'Status', render: (e: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        e.status === 'approved' ? 'bg-green-100 text-green-800' : e.status === 'rejected' ? 'bg-red-100 text-red-800' :
        e.status === 'implemented' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{e.status}</span>
    )},
    { key: 'createdAt', header: 'Date', render: (e: any) => new Date(e.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ECR / ECO</h1>
        <button className="btn-primary" onClick={() => toast('Create ECR — implement modal')}><Plus className="w-4 h-4 mr-2" /> New ECR</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Failed to load ECRs.</div>}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search ECRs..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border-0 bg-transparent focus:ring-0 text-sm" />
          </div>
        </CardHeader>
        <CardContent><DataTable columns={columns} data={filtered || []} loading={isLoading} /></CardContent>
      </Card>
    </div>
  );
}
