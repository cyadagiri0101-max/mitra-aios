import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export function QuotationsPage() {
  const [search, setSearch] = useState('');
  const { data: quotations, isLoading, error } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => api.get('/commercial/quotations').then(r => { const p = r.data; return Array.isArray(p) ? p : (p?.data ?? []); }),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const filtered = quotations?.filter((q: any) => q.quotationNumber?.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key: 'quotationNumber', header: 'Quotation #' },
    { key: 'totalAmount', header: 'Amount', render: (q: any) => `₹${q.totalAmount?.toLocaleString() || 0}` },
    { key: 'status', header: 'Status', render: (q: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        q.status === 'approved' ? 'bg-green-100 text-green-800' : q.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
        q.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{q.status}</span>
    )},
    { key: 'validUntil', header: 'Valid Until', render: (q: any) => q.validUntil ? new Date(q.validUntil).toLocaleDateString() : '-' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
        <button className="btn-primary" onClick={() => toast('Create quotation — implement modal')}><Plus className="w-4 h-4 mr-2" /> New Quotation</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Failed to load quotations.</div>}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search quotations..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border-0 bg-transparent focus:ring-0 text-sm" />
          </div>
        </CardHeader>
        <CardContent><DataTable columns={columns} data={filtered || []} loading={isLoading} /></CardContent>
      </Card>
    </div>
  );
}
