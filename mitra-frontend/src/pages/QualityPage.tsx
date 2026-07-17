import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export function QualityPage() {
  const [search, setSearch] = useState('');
  const { data: trialsRes, isLoading, error } = useQuery({
    queryKey: ['quality-trials'],
    queryFn: () => api.get('/quality/trials').then(r => { const p = r.data; return Array.isArray(p) ? p : (p?.data ?? []); }),
    retry: 2, staleTime: 2 * 60 * 1000,
  });
  const trials = trialsRes ?? [];

  const filtered = trials.filter((t: any) => t.observations?.toLowerCase().includes(search.toLowerCase()) || t.result?.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key: 'id', header: 'Trial ID', render: (t: any) => t.id?.substring(0, 8) + '…' },
    { key: 'observations', header: 'Observations', render: (t: any) => <span title={t.observations}>{(t.observations ?? '').substring(0, 60)}{t.observations?.length > 60 ? '…' : ''}</span> },
    { key: 'result', header: 'Result', render: (t: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        t.result === 'PASS' ? 'bg-green-100 text-green-800' : t.result === 'FAIL' ? 'bg-red-100 text-red-800' :
        t.result === 'CONDITIONAL' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{t.result ?? '—'}</span>
    )},
    { key: 'trialDate', header: 'Date', render: (t: any) => t.trialDate ? new Date(t.trialDate).toLocaleDateString() : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quality Management</h1>
        <button className="btn-primary" onClick={() => toast('Create trial — implement modal')}><Plus className="w-4 h-4 mr-2" /> New Trial</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Failed to load quality trials.</div>}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search trials…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border-0 bg-transparent focus:ring-0 text-sm" />
          </div>
        </CardHeader>
        <CardContent><DataTable columns={columns} data={filtered} loading={isLoading} /></CardContent>
      </Card>
    </div>
  );
}
