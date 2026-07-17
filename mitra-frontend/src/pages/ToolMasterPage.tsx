import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { Modal } from '../components/Modal';
import { Plus, Search, AlertTriangle, Pencil, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  toolNo: z.string().min(2, 'Tool number is required').max(50),
  toolType: z.enum(['BM', 'IM']),
  projectName: z.string().max(200).optional().or(z.literal('')),
  customerName: z.string().max(200).optional().or(z.literal('')),
  productName: z.string().max(200).optional().or(z.literal('')),
  machine: z.string().max(100).optional().or(z.literal('')),
  cavity: z.string().max(50).optional().or(z.literal('')),
  status: z.string().max(50).optional().or(z.literal('')),
  revision: z.string().max(20).optional().or(z.literal('')),
  description: z.string().max(2000).optional().or(z.literal('')),
});

type ToolMasterForm = z.infer<typeof schema>;
type ToolMasterRecord = {
  id: string;
  toolNo: string;
  toolType: 'BM' | 'IM';
  projectName?: string | null;
  customerName?: string | null;
  productName?: string | null;
  machine?: string | null;
  cavity?: string | null;
  status?: string | null;
  revision?: string | null;
  description?: string | null;
};

type ToolMasterListResponse = {
  data: ToolMasterRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function ToolMasterPage() {
  const [search, setSearch] = useState('');
  const [toolTypeFilter, setToolTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<'toolNo' | 'projectName'>('toolNo');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<ToolMasterRecord | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery<ToolMasterListResponse>({
    queryKey: ['tool-master', search, toolTypeFilter, statusFilter, sortBy, sortOrder, page],
    queryFn: () => api.get('/tool-master', {
      params: {
        page,
        limit: 20,
        search: search || undefined,
        toolType: toolTypeFilter === 'ALL' ? undefined : toolTypeFilter,
        status: statusFilter || undefined,
        sortBy,
        sortOrder,
      },
    }).then(r => r.data),
    retry: 2,
  });

  const createMutation = useMutation({
    mutationFn: (payload: ToolMasterForm) => api.post('/tool-master', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tool-master'] });
      toast.success('Tool record created');
      setIsModalOpen(false);
      setSelected(null);
      reset();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create tool record'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: ToolMasterForm & { id: string }) => api.patch(`/tool-master/${payload.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tool-master'] });
      toast.success('Tool record updated');
      setIsModalOpen(false);
      setSelected(null);
      reset();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update tool record'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tool-master/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tool-master'] });
      toast.success('Tool record deleted');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete tool record'),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ToolMasterForm>({ resolver: zodResolver(schema) });

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const openCreate = () => {
    setSelected(null);
    setViewOnly(false);
    reset({ toolNo: '', toolType: 'BM', projectName: '', customerName: '', productName: '', machine: '', cavity: '', status: 'ACTIVE', revision: 'A', description: '' });
    setIsModalOpen(true);
  };

  const openEdit = (item: ToolMasterRecord) => {
    setSelected(item);
    setViewOnly(false);
    reset({
      toolNo: item.toolNo,
      toolType: item.toolType,
      projectName: item.projectName ?? '',
      customerName: item.customerName ?? '',
      productName: item.productName ?? '',
      machine: item.machine ?? '',
      cavity: item.cavity ?? '',
      status: item.status ?? 'ACTIVE',
      revision: item.revision ?? 'A',
      description: item.description ?? '',
    });
    setIsModalOpen(true);
  };

  const onSubmit = (form: ToolMasterForm) => {
    if (viewOnly) return;
    if (selected) updateMutation.mutate({ ...form, id: selected.id });
    else createMutation.mutate(form);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleToolTypeChange = (value: string) => {
    setToolTypeFilter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tool Master</h1>
          <p className="text-sm text-gray-500">Maintain the foundational engineering tool register for BM and IM projects.</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4 mr-2" /> New Tool</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Failed to load tool master records.</div>}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Search className="w-5 h-5 text-gray-400" />
              <input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search tool number, project, or customer" className="flex-1 border-0 bg-transparent focus:ring-0 text-sm outline-none" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <select value={toolTypeFilter} onChange={(e) => handleToolTypeChange(e.target.value)} className="input-field">
                <option value="ALL">All Types</option>
                <option value="BM">BM</option>
                <option value="IM">IM</option>
              </select>
              <input value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} placeholder="Status" className="input-field" />
              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value as 'toolNo' | 'projectName'); setPage(1); }} className="input-field">
                <option value="toolNo">Sort by Tool No</option>
                <option value="projectName">Sort by Project</option>
              </select>
            </div>
            <select value={sortOrder} onChange={(e) => { setSortOrder(e.target.value as 'ASC' | 'DESC'); setPage(1); }} className="input-field min-w-[120px]">
              <option value="ASC">Ascending</option>
              <option value="DESC">Descending</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-sm text-gray-500">Showing {items.length} of {total} records</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="px-3 py-2">Tool No</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Project</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-400">Loading…</td></tr> : items.map((item: ToolMasterRecord) => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-3 py-3 font-medium">{item.toolNo}</td>
                    <td className="px-3 py-3">{item.toolType}</td>
                    <td className="px-3 py-3">{item.projectName ?? '—'}</td>
                    <td className="px-3 py-3">{item.customerName ?? '—'}</td>
                    <td className="px-3 py-3">{item.status ?? '—'}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => openEdit(item)} className="inline-flex items-center gap-1 text-sky-600"><Pencil className="w-4 h-4" /> Edit</button>
                        <button type="button" onClick={() => { if (window.confirm('Delete this tool record?')) deleteMutation.mutate(item.id); }} className="inline-flex items-center gap-1 text-rose-600"><Trash2 className="w-4 h-4" /> Delete</button>
                        <button type="button" onClick={() => navigate(`/tool-master/${encodeURIComponent(item.toolNo)}`)} className="inline-flex items-center gap-1 text-gray-600"><Eye className="w-4 h-4" /> View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">Page {page} of {Math.max(1, totalPages)}</div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage(prev => Math.max(1, prev - 1))} disabled={page === 1} className="btn-secondary disabled:opacity-50"><ChevronLeft className="w-4 h-4 mr-1" /> Prev</button>
              <button type="button" onClick={() => setPage(prev => prev + 1)} disabled={page >= totalPages} className="btn-secondary disabled:opacity-50">Next <ChevronRight className="w-4 h-4 ml-1" /></button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelected(null); setViewOnly(false); reset(); }} title={selected ? (viewOnly ? 'View Tool' : 'Edit Tool') : 'Add Tool'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tool Number *</label>
              <input {...register('toolNo')} className={`input-field ${errors.toolNo ? 'border-red-400' : ''}`} readOnly={viewOnly} />
              {errors.toolNo && <p className="mt-1 text-xs text-red-600">{errors.toolNo.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select {...register('toolType')} className="input-field" disabled={viewOnly}>
                <option value="BM">BM</option>
                <option value="IM">IM</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
              <input {...register('projectName')} className="input-field" readOnly={viewOnly} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input {...register('customerName')} className="input-field" readOnly={viewOnly} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input {...register('productName')} className="input-field" readOnly={viewOnly} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Machine</label>
              <input {...register('machine')} className="input-field" readOnly={viewOnly} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cavity</label>
              <input {...register('cavity')} className="input-field" readOnly={viewOnly} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <input {...register('status')} className="input-field" readOnly={viewOnly} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Revision</label>
              <input {...register('revision')} className="input-field" readOnly={viewOnly} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...register('description')} rows={3} className="input-field" readOnly={viewOnly} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setIsModalOpen(false); setSelected(null); setViewOnly(false); reset(); }} className="btn-secondary">Cancel</button>
            {!viewOnly && <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary disabled:opacity-50">{selected ? 'Save' : 'Create'}</button>}
          </div>
        </form>
      </Modal>
    </div>
  );
}
