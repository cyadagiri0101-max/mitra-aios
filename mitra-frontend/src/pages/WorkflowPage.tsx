import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export function WorkflowPage() {
  const [search, setSearch] = useState('');
  const { data: definitions, isLoading, error } = useQuery({
    queryKey: ['workflow-defs'],
    queryFn: () => api.get('/workflow/stages/mold-project').then(r => { const p = r.data; return Array.isArray(p) ? p : (p?.data ?? []); }),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const filtered = definitions?.filter((d: any) => d.name?.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'entityType', header: 'Entity Type' },
    { key: 'isActive', header: 'Active', render: (d: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{d.isActive ? 'Yes' : 'No'}</span>
    )},
    { key: 'transitions', header: 'Transitions', render: (d: any) => d.transitions?.length || 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Workflow Engine</h1>
        <button className="btn-primary" onClick={() => toast('Create workflow — implement modal')}><Plus className="w-4 h-4 mr-2" /> New Definition</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Failed to load workflow definitions.</div>}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search workflows..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border-0 bg-transparent focus:ring-0 text-sm" />
          </div>
        </CardHeader>
        <CardContent><DataTable columns={columns} data={filtered || []} loading={isLoading} /></CardContent>
      </Card>
    </div>
  );
}
