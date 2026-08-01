import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { listProjectDocuments, createProjectDocument, updateProjectDocument, releaseProjectDocument, archiveProjectDocument, removeProjectDocument, listProjectFolders, createProjectFolder, listDocumentVersions, getProject } from '../utils/projectApi';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { ArrowLeft, Plus, FolderPlus, FileText, Send, Archive, History, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const docSchema = z.object({
  title: z.string().min(2, 'Title required').max(200),
  description: z.string().optional().or(z.literal('')),
  documentType: z.string().optional().or(z.literal('')),
  content: z.string().optional().or(z.literal('')),
});

const DOC_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-200 text-slate-700', IN_REVIEW: 'bg-amber-100 text-amber-800',
  RELEASED: 'bg-green-100 text-green-800', ARCHIVED: 'bg-slate-300 text-slate-700',
};

export function ProjectDocumentsPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [docModal, setDocModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [folderModal, setFolderModal] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [versionsFor, setVersionsFor] = useState<any>(null);
  const [folderName, setFolderName] = useState('');

  const { data } = useQuery({ queryKey: ['documents', id], queryFn: () => listProjectDocuments(id).then(r => r.data), enabled: !!id });
  const { data: foldersData } = useQuery({ queryKey: ['folders', id], queryFn: () => listProjectFolders(id).then(r => r.data), enabled: !!id });
  const { data: versionsData } = useQuery({ queryKey: ['versions', id, versionsFor?.id], queryFn: () => listDocumentVersions(id, versionsFor!.id).then(r => r.data), enabled: !!versionsFor });
  const { data: projectData } = useQuery({ queryKey: ['project', id], queryFn: () => getProject(id).then(r => r.data) });

  const documents = data?.data ?? data ?? [];
  const folders = foldersData?.data ?? foldersData ?? [];
  const project = projectData?.data ?? projectData;

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(docSchema) });

  const filtered = selectedFolder ? documents.filter((d: any) => (d.folder?.id ?? d.folderId) === selectedFolder) : documents;

  const createFolderMutation = useMutation({
    mutationFn: () => createProjectFolder(id, folderName),
    onSuccess: () => { toast.success('Folder created'); queryClient.invalidateQueries({ queryKey: ['folders', id] }); setFolderModal(false); setFolderName(''); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Folder creation failed'),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) => editing ? updateProjectDocument(id, editing.id, payload) : createProjectDocument(id, payload),
    onSuccess: () => { toast.success(editing ? 'Document updated' : 'Document created'); queryClient.invalidateQueries({ queryKey: ['documents', id] }); setDocModal(false); setEditing(null); reset(); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Save failed'),
  });

  const releaseMutation = useMutation({
    mutationFn: (did: string) => releaseProjectDocument(id, did),
    onSuccess: () => { toast.success('Document released'); queryClient.invalidateQueries({ queryKey: ['documents', id] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Release failed'),
  });

  const archiveMutation = useMutation({
    mutationFn: (did: string) => archiveProjectDocument(id, did),
    onSuccess: () => { toast.success('Document archived'); queryClient.invalidateQueries({ queryKey: ['documents', id] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Archive failed'),
  });

  const removeMutation = useMutation({
    mutationFn: (did: string) => removeProjectDocument(id, did),
    onSuccess: () => { toast.success('Document removed'); queryClient.invalidateQueries({ queryKey: ['documents', id] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Remove failed'),
  });

  const onSubmit = (d: any) => saveMutation.mutate({ ...d, description: d.description || null, documentType: d.documentType || null, content: d.content || null, folderId: selectedFolder || null });

  const columns = [
    { key: 'title', header: 'Document', render: (d: any) => (
      <div><p className="text-slate-100">{d.title}</p>{d.description && <p className="text-xs text-slate-500">{d.description}</p>}</div>
    ) },
    { key: 'folder', header: 'Folder', render: (d: any) => <span className="text-sm text-slate-400">{d.folder?.folderName ?? d.folderName ?? '—'}</span> },
    { key: 'documentType', header: 'Type', render: (d: any) => d.documentType ? <span className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-300">{d.documentType}</span> : <span className="text-sm text-slate-600">—</span> },
    { key: 'version', header: 'Version', render: (d: any) => <span className="font-mono text-sm text-sky-300">{d.currentVersion?.versionNumber ?? d.versionNumber ?? 'v0'}</span> },
    { key: 'status', header: 'Status', render: (d: any) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${DOC_STATUS_COLORS[d.status] ?? 'bg-slate-200 text-slate-700'}`}>{d.status ?? 'DRAFT'}</span> },
    { key: 'actions', header: '', render: (d: any) => (
      <div className="flex items-center gap-1.5">
        <button className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-sky-300" title="Versions" onClick={() => { setVersionsFor(d); }}><History className="w-4 h-4" /></button>
        {d.status !== 'RELEASED' && d.status !== 'ARCHIVED' && (
          <button className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-green-300" title="Release (creates new version)" onClick={() => { if (confirm('Release this document? A new immutable version will be created.')) releaseMutation.mutate(d.id); }}><Send className="w-4 h-4" /></button>
        )}
        {d.status !== 'ARCHIVED' && (
          <button className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-amber-300" title="Archive" onClick={() => { if (confirm('Archive this document?')) archiveMutation.mutate(d.id); }}><Archive className="w-4 h-4" /></button>
        )}
        <button className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white" title="Edit" onClick={() => { setEditing(d); reset({ title: d.title ?? '', description: d.description ?? '', documentType: d.documentType ?? '', content: d.content ?? '' }); setDocModal(true); }}>✎</button>
        <button className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-rose-300" title="Delete" onClick={() => { if (confirm('Delete document?')) removeMutation.mutate(d.id); }}><Trash2 className="w-4 h-4" /></button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-6">
      <Link to={`/projects/${id}`} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back to {project?.name ?? 'project'}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="mt-2 text-sm text-slate-400">{documents.length} documents · immutable versioning on release.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setFolderModal(true)}><FolderPlus className="w-4 h-4 mr-2" /> New Folder</button>
          <button className="btn-primary" onClick={() => { setEditing(null); reset({ documentType: 'TECHNICAL' }); setDocModal(true); }}><Plus className="w-4 h-4 mr-2" /> New Document</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setSelectedFolder(null)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${!selectedFolder ? 'border-sky-400 text-sky-300 bg-sky-500/10' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}>
          All
        </button>
        {folders.map((f: any) => (
          <button key={f.id} onClick={() => setSelectedFolder(f.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${selectedFolder === f.id ? 'border-sky-400 text-sky-300 bg-sky-500/10' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}>
            <FileText className="w-3 h-3 inline mr-1" />{f.folderName} <span className="text-slate-500">({f.documentCount ?? 0})</span>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="px-6 py-4"><h2 className="font-semibold text-white">{selectedFolder ? folders.find((f: any) => f.id === selectedFolder)?.folderName ?? 'Folder' : 'All documents'}</h2></CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filtered} loading={!data} />
        </CardContent>
      </Card>

      <Modal isOpen={folderModal} onClose={() => setFolderModal(false)} title="New Folder">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Folder name *</label>
            <input value={folderName} onChange={e => setFolderName(e.target.value)} className="input-field" placeholder="e.g. Design Drawings" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button className="btn-secondary" onClick={() => setFolderModal(false)}>Cancel</button>
            <button className="btn-primary disabled:opacity-50" disabled={!folderName.trim() || createFolderMutation.isPending} onClick={() => createFolderMutation.mutate()}>Create</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={docModal} onClose={() => { setDocModal(false); setEditing(null); reset(); }} title={editing ? 'Edit Document' : 'New Document'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input {...register('title')} className={`input-field ${errors.title ? 'border-red-400' : ''}`} placeholder="Document title" />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message?.toString()}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <input {...register('documentType')} className="input-field" placeholder="e.g. TECHNICAL" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Folder</label>
              <select value={selectedFolder ?? ''} onChange={e => setSelectedFolder(e.target.value || null)} className="input-field">
                <option value="">Root</option>
                {folders.map((f: any) => <option key={f.id} value={f.id}>{f.folderName}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input {...register('description')} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea {...register('content')} className="input-field" rows={4} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setDocModal(false); setEditing(null); reset(); }} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>Save</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!versionsFor} onClose={() => setVersionsFor(null)} title={`Versions — ${versionsFor?.title ?? ''}`}>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {(versionsData?.data ?? versionsData ?? []).length === 0 && <p className="text-sm text-slate-500">No versions yet.</p>}
          {(versionsData?.data ?? versionsData ?? []).map((v: any) => (
            <div key={v.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2">
              <div>
                <p className="font-mono text-sm text-sky-300">{v.versionNumber ?? `v${v.majorVersion}.${v.minorVersion}`}</p>
                <p className="text-xs text-slate-500">{v.releaseNotes ?? 'Released'}</p>
              </div>
              <span className="text-xs text-slate-400">{v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
