import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Upload, Search, Download, History, RotateCcw, Lock, Unlock, FileText, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface DocumentVersion {
  version: string;
  createdAt: string;
  uploadedBy: { name: string };
  changeLog: string;
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export function DocumentsPage() {
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('project');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState({ fileName: '', version: '1.0', changeLog: '' });
  const queryClient = useQueryClient();

  const { data: docs, isLoading, error } = useQuery({
    queryKey: ['documents', entityType],
    queryFn: () => api.get(`/documents/${entityType}/all`).then(r => { const p = r.data; return Array.isArray(p) ? p : (p?.data ?? []); }),
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });

  const uploadMutation = useMutation({
    mutationFn: (data: FormData) => api.post(`/documents/${entityType}/upload`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['documents', entityType] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', entityType] });
      toast.success('Document uploaded successfully');
      setIsUploadModalOpen(false);
      setFile(null);
      setUploadData({ fileName: '', version: '1.0', changeLog: '' });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to upload document'),
  });

  const checkoutMutation = useMutation({
    mutationFn: (docId: string) => api.post(`/documents/${entityType}/${docId}/checkout`),
    onMutate: async (_docId) => {
      await queryClient.cancelQueries({ queryKey: ['documents', entityType] });
      const previous = queryClient.getQueryData(['documents', entityType]);
      queryClient.setQueryData(['documents', entityType], (old: any[]) =>
        old?.map((d: any) => d.id === _docId ? { ...d, isCheckedOut: true } : d) ?? []
      );
      return { previous };
    },
    onError: (err, _docId, context) => {
      queryClient.setQueryData(['documents', entityType], context?.previous);
      toast.error((err as any)?.response?.data?.message || 'Failed to check out');
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['documents', entityType] }); toast.success('Document checked out'); },
  });

  const checkinMutation = useMutation({
    mutationFn: (docId: string) => api.post(`/documents/${entityType}/${docId}/checkin`),
    onMutate: async (_docId) => {
      await queryClient.cancelQueries({ queryKey: ['documents', entityType] });
      const previous = queryClient.getQueryData(['documents', entityType]);
      queryClient.setQueryData(['documents', entityType], (old: any[]) =>
        old?.map((d: any) => d.id === _docId ? { ...d, isCheckedOut: false } : d) ?? []
      );
      return { previous };
    },
    onError: (err, _docId, context) => {
      queryClient.setQueryData(['documents', entityType], context?.previous);
      toast.error((err as any)?.response?.data?.message || 'Failed to check in');
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['documents', entityType] }); toast.success('Document checked in'); },
  });

  const rollbackMutation = useMutation({
    mutationFn: ({ docId, version }: { docId: string; version: string }) =>
      api.post(`/documents/${entityType}/${docId}/rollback`, { version }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', entityType] });
      toast.success('Document rolled back successfully');
      setIsHistoryModalOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to rollback'),
  });

  const { data: historyData } = useQuery({
    queryKey: ['document-history', selectedDoc?.id],
    queryFn: () => api.get(`/documents/${entityType}/${selectedDoc?.id}/history`).then(r => r.data?.versions ?? []),
    enabled: !!selectedDoc?.id && isHistoryModalOpen,
    retry: 1,
  });

  const filtered = docs?.filter((d: any) => d.fileName?.toLowerCase().includes(search.toLowerCase()));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    // MEDIUM FIX M-5: File validation
    if (selected.size > MAX_SIZE) { toast.error('File too large. Max 50MB.'); return; }
    if (!ALLOWED_TYPES.includes(selected.type)) { toast.error('Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX.'); return; }
    setFile(selected);
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error('Please select a file'); return; }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', uploadData.fileName || file.name);
    formData.append('version', uploadData.version);
    formData.append('changeLog', uploadData.changeLog);
    uploadMutation.mutate(formData);
  };

  const handleRollback = (version: string) => {
    // MEDIUM FIX M-4: Confirmation dialog
    if (!window.confirm(`Rollback "${selectedDoc?.fileName}" to version ${version}? This cannot be undone.`)) return;
    rollbackMutation.mutate({ docId: selectedDoc.id, version });
  };

  const columns = [
    { key: 'fileName', header: 'File Name' },
    { key: 'version', header: 'Version' },
    { key: 'uploadedBy', header: 'Uploaded By', render: (d: any) => d.uploadedBy?.name || '-' },
    { key: 'isCheckedOut', header: 'Status', render: (d: any) => (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${d.isCheckedOut ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
        {d.isCheckedOut ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
        {d.isCheckedOut ? 'Checked Out' : 'Available'}
      </span>
    )},
    { key: 'createdAt', header: 'Date', render: (d: any) => new Date(d.createdAt).toLocaleDateString() },
    { key: 'actions', header: 'Actions', render: (d: any) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); window.open(`/api/documents/${entityType}/${d.id}/download`, '_blank'); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-mitra-600" title="Download"><Download className="w-4 h-4" /></button>
        {!d.isCheckedOut ? (
          <button onClick={(e) => { e.stopPropagation(); checkoutMutation.mutate(d.id); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-amber-600" title="Check Out" disabled={checkoutMutation.isPending}><Lock className="w-4 h-4" /></button>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); checkinMutation.mutate(d.id); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-green-600" title="Check In" disabled={checkinMutation.isPending}><Unlock className="w-4 h-4" /></button>
        )}
        <button onClick={(e) => { e.stopPropagation(); setSelectedDoc(d); setIsHistoryModalOpen(true); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600" title="History"><History className="w-4 h-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Document Management</h1>
        <button className="btn-primary" onClick={() => setIsUploadModalOpen(true)}><Upload className="w-4 h-4 mr-2" /> Upload</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Failed to load documents. Please try again.
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border-0 bg-transparent focus:ring-0 text-sm" />
            <select value={entityType} onChange={e => setEntityType(e.target.value)} className="input-field w-40">
              <option value="project">Projects</option>
              <option value="design">Design</option>
              <option value="quality">Quality</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filtered || []} loading={isLoading} />
        </CardContent>
      </Card>

      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload Document">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-mitra-50 file:text-mitra-700 hover:file:bg-mitra-100" />
            {file && <p className="text-xs text-gray-500 mt-1">Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File Name</label>
            <input type="text" value={uploadData.fileName} onChange={e => setUploadData({...uploadData, fileName: e.target.value})} className="input-field" placeholder="Leave blank to use original filename" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
            <input type="text" value={uploadData.version} onChange={e => setUploadData({...uploadData, version: e.target.value})} className="input-field" placeholder="1.0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Change Log</label>
            <textarea value={uploadData.changeLog} onChange={e => setUploadData({...uploadData, changeLog: e.target.value})} className="input-field" rows={2} placeholder="Describe changes..." />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsUploadModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={uploadMutation.isPending} className="btn-primary disabled:opacity-50">{uploadMutation.isPending ? 'Uploading…' : 'Upload'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title={`Revision History — ${selectedDoc?.fileName}`} size="lg">
        <div className="space-y-3">
          {historyData?.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No revision history available.</p>}
          {historyData?.map((v: DocumentVersion, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Version {v.version}</p>
                  <p className="text-xs text-gray-500">{v.uploadedBy?.name} • {new Date(v.createdAt).toLocaleDateString()}</p>
                  {v.changeLog && <p className="text-xs text-gray-600 mt-1">{v.changeLog}</p>}
                </div>
              </div>
              <button onClick={() => handleRollback(v.version)} disabled={rollbackMutation.isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 hover:bg-gray-50 text-gray-700 disabled:opacity-50">
                <RotateCcw className="w-3 h-3" /> Rollback
              </button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
