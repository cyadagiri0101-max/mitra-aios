import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Search, FolderKanban, FileText, Clock } from 'lucide-react';

export function EngineeringLibraryPage() {
  const [query, setQuery] = useState('');

  const { data: projects, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ['ekl-projects'],
    queryFn: () => api.get('/ekl/projects').then(r => r.data),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const { data: documents, isLoading: documentsLoading, error: documentsError } = useQuery({
    queryKey: ['ekl-documents'],
    queryFn: () => api.get('/ekl/documents').then(r => r.data),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const filteredProjects = projects?.filter((item: any) =>
    item.name?.toLowerCase().includes(query.toLowerCase()) || item.projectNumber?.toLowerCase().includes(query.toLowerCase()),
  );

  const filteredDocuments = documents?.filter((item: any) =>
    item.name?.toLowerCase().includes(query.toLowerCase()) || item.fileName?.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Engineering Library</h1>
          <p className="mt-2 text-sm text-gray-500">Browse projects and documents from the Engineering Knowledge Library.</p>
        </div>
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search EKL projects and docs..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mitra-500 focus:border-mitra-500"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-mitra-600" />
              <CardTitle>EKL Projects</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {projectsError && <div className="text-sm text-red-600">Failed to load EKL projects.</div>}
            {projectsLoading && <div className="text-sm text-gray-500">Loading projects…</div>}
            {!projectsLoading && !projectsError && filteredProjects?.length === 0 && (
              <div className="text-sm text-gray-500">No matching projects found.</div>
            )}
            <div className="space-y-3">
              {filteredProjects?.map((project: any) => (
                <div key={project.id} className="rounded-lg border border-gray-100 p-4 hover:bg-gray-50 transition">
                  <p className="font-semibold text-gray-900">{project.name || project.title || 'Untitled project'}</p>
                  <p className="text-sm text-gray-500">{project.description || project.summary || 'No description provided'}</p>
                  <div className="mt-2 text-xs text-gray-400">{project.projectNumber ? `Project #${project.projectNumber}` : project.id}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-mitra-600" />
              <CardTitle>EKL Documents</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {documentsError && <div className="text-sm text-red-600">Failed to load EKL documents.</div>}
            {documentsLoading && <div className="text-sm text-gray-500">Loading documents…</div>}
            {!documentsLoading && !documentsError && filteredDocuments?.length === 0 && (
              <div className="text-sm text-gray-500">No matching documents found.</div>
            )}
            <div className="space-y-3">
              {filteredDocuments?.map((doc: any) => (
                <div key={doc.id} className="rounded-lg border border-gray-100 p-4 hover:bg-gray-50 transition">
                  <p className="font-semibold text-gray-900">{doc.fileName || doc.name || 'Untitled document'}</p>
                  <p className="text-sm text-gray-500">{doc.description || doc.summary || 'No description available'}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
                    {doc.projectNumber && <span>Project #{doc.projectNumber}</span>}
                    {doc.uploadedAt && <span>Updated {new Date(doc.uploadedAt).toLocaleDateString()}</span>}
                    {doc.version && <span>Version {doc.version}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-mitra-600" />
            <CardTitle>EKL sync state</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">All engineering data is retrieved from EKL REST API and displayed without local import or duplication.</p>
        </CardContent>
      </Card>
    </div>
  );
}
