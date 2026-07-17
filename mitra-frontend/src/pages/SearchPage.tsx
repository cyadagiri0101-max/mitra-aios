import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Search, FileText, FolderKanban, Mail, Factory, AlertTriangle } from 'lucide-react';

const entityIcons: Record<string, any> = {
  projects: FolderKanban,
  enquiries: Mail,
  quotations: FileText,
  work_orders: Factory,
  capas: AlertTriangle,
};

export function SearchPage() {
  const [query, setQuery] = useState('');
  const { data: results, isLoading, error, refetch } = useQuery({
    queryKey: ['global-search', query],
    queryFn: () => api.get(`/search?q=${encodeURIComponent(query)}`).then(r => r.data),
    enabled: query.length > 2,
    retry: 1,
  });
  const {
    data: eklResults,
    isLoading: isEklLoading,
    error: eklError,
    refetch: refetchEkl,
  } = useQuery({
    queryKey: ['ekl-search', query],
    queryFn: () => api.get(`/ekl/search`, { params: { q: query } }).then(r => r.data),
    enabled: query.length > 2,
    retry: 1,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Global Search</h1>
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search across all entities..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mitra-500 focus:border-mitra-500" />
            </div>
            <button onClick={() => { refetch(); refetchEkl(); }} className="btn-primary">Search</button>
          </div>
        </CardContent>
      </Card>
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">Search failed. Please try again.</div>}
      {isLoading && <div className="text-center py-8 text-gray-500">Searching...</div>}
      {results?.map((group: any) => {
        const Icon = entityIcons[group.entityType] || FileText;
        return (
          <Card key={group.entityType}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon className="w-5 h-5 text-mitra-600" />
                <CardTitle className="capitalize">{group.entityType.replace(/_/g, ' ')}</CardTitle>
                <span className="text-sm text-gray-500">({group.items.length} results)</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {group.items.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100 transition-colors">
                    <p className="font-medium text-gray-900">{item.name || item.title || item.projectNumber || item.enquiryNumber || 'Untitled'}</p>
                    <p className="text-sm text-gray-500">{item.description?.substring(0, 100)}...</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
      {query.length > 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-mitra-600" />
              <CardTitle>Engineering Knowledge Search</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {eklError && <div className="text-sm text-red-600">EKL search failed. Please try again later.</div>}
            {isEklLoading && <div className="text-sm text-gray-500">Loading engineering library results…</div>}
            {!isEklLoading && !eklError && (!eklResults?.results || eklResults.results.length === 0) && (
              <div className="text-sm text-gray-500">No engineering library results found.</div>
            )}
            {!isEklLoading && eklResults?.results?.map((item: any, index: number) => (
              <div key={index} className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                <p className="font-medium text-gray-900">{item.title || item.name || item.summary || 'Result'}</p>
                <p className="text-sm text-gray-500">{item.description || item.summary || item.type || 'No description available'}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
