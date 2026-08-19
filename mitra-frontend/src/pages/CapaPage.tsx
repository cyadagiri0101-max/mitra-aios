import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Plus, Search, AlertTriangle, Pencil, CheckCircle2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const capaSchema = z.object({
  capaNumber: z.string().min(1, 'CAPA Number is required').max(30),
  projectId: z.string().uuid('Project ID must be a valid UUID').optional().or(z.literal('')),
  trialId: z.string().uuid('Trial ID must be a valid UUID').optional().or(z.literal('')),
  capaType: z.enum(['CORRECTIVE', 'PREVENTIVE']).default('CORRECTIVE'),
  problemDescription: z.string().min(5, 'Problem description is required').max(2000),
  rootCause: z.string().max(2000).optional().or(z.literal('')),
  correctiveAction: z.string().max(2000).optional().or(z.literal('')),
  preventiveAction: z.string().max(2000).optional().or(z.literal('')),
  targetDate: z.string().optional().or(z.literal('')),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'IMPLEMENTED', 'VERIFIED', 'CLOSED', 'REJECTED']).default('OPEN'),
});

type CapaForm = z.infer<typeof capaSchema>;

type CapaRecord = {
  id: string;
  capaNumber: string;
  projectId?: string | null;
  trialId?: string | null;
  capaType: 'CORRECTIVE' | 'PREVENTIVE';
  problemDescription: string;
  rootCause?: string | null;
  correctiveAction?: string | null;
  preventiveAction?: string | null;
  targetDate?: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'VERIFIED' | 'CLOSED' | 'REJECTED';
};

export function CapaPage() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCapa, setSelectedCapa] = useState<CapaRecord | null>(null);
  const queryClient = useQueryClient();

  const { data: capas, isLoading, error } = useQuery({
    queryKey: ['capas'],
    queryFn: () => api.get('/capa').then(r => { const payload = r.data; return Array.isArray(payload) ? payload : (payload?.data ?? []); }),
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CapaForm) => api.post('/capa', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capas'] });
      toast.success('CAPA created successfully');
      setIsModalOpen(false);
      setSelectedCapa(null);
      reset();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create CAPA'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: CapaForm & { id: string }) => api.patch(`/capa/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capas'] });
      toast.success('CAPA updated successfully');
      setIsModalOpen(false);
      setSelectedCapa(null);
      reset();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update CAPA'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/capa/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capas'] });
      toast.success('CAPA deleted successfully');
      setSelectedCapa(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete CAPA'),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/capa/${id}/transition`, { toStatus: 'CLOSED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capas'] });
      toast.success('CAPA and linked NCR verified and closed successfully');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to close CAPA'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<CapaForm>({ resolver: zodResolver(capaSchema) });

  const filtered = useMemo(() => (capas ?? []).filter((c: CapaRecord) =>
    c.capaNumber?.toLowerCase().includes(search.toLowerCase()) ||
    c.problemDescription?.toLowerCase().includes(search.toLowerCase()) ||
    c.capaType?.toLowerCase().includes(search.toLowerCase()) ||
    c.status?.toLowerCase().includes(search.toLowerCase()),
  ), [capas, search]);

  const openCreateModal = () => {
    setSelectedCapa(null);
    reset({
      capaNumber: '',
      projectId: '',
      trialId: '',
      capaType: 'CORRECTIVE',
      problemDescription: '',
      rootCause: '',
      correctiveAction: '',
      preventiveAction: '',
      targetDate: '',
      status: 'OPEN',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (capa: CapaRecord) => {
    setSelectedCapa(capa);
    reset({
      capaNumber: capa.capaNumber,
      projectId: capa.projectId ?? '',
      trialId: capa.trialId ?? '',
      capaType: capa.capaType,
      problemDescription: capa.problemDescription,
      rootCause: capa.rootCause ?? '',
      correctiveAction: capa.correctiveAction ?? '',
      preventiveAction: capa.preventiveAction ?? '',
      targetDate: capa.targetDate ? new Date(capa.targetDate).toISOString().slice(0, 10) : '',
      status: capa.status,
    });
    setIsModalOpen(true);
  };

  const onSubmit = (data: CapaForm) => {
    if (selectedCapa) {
      updateMutation.mutate({ ...data, id: selectedCapa.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    { key: 'capaNumber', header: 'CAPA #' },
    { key: 'projectId', header: 'Project ID' },
    { key: 'capaType', header: 'Type' },
    { key: 'status', header: 'Status', render: (c: CapaRecord) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        c.status === 'CLOSED' ? 'bg-green-100 text-green-800' : c.status === 'OPEN' ? 'bg-red-100 text-red-800' :
        c.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{c.status}</span>
    )},
    { key: 'problemDescription', header: 'Problem', render: (c: CapaRecord) => <span title={c.problemDescription}>{c.problemDescription.length > 80 ? `${c.problemDescription.slice(0, 80)}…` : c.problemDescription}</span> },
    { key: 'targetDate', header: 'Target Date', render: (c: CapaRecord) => c.targetDate ? new Date(c.targetDate).toLocaleDateString() : '—' },
    { key: 'actions', header: 'Actions', render: (c: CapaRecord) => (
      <div className="flex items-center gap-2">
        <button type="button" onClick={(e) => { e.stopPropagation(); openEditModal(c); }} className="text-sky-600 hover:text-sky-800"><Pencil className="w-4 h-4" /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); closeMutation.mutate(c.id); }} className="text-emerald-600 hover:text-emerald-800"><CheckCircle2 className="w-4 h-4" /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this CAPA?')) deleteMutation.mutate(c.id); }} className="text-rose-600 hover:text-rose-800"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CAPA Management</h1>
          <p className="text-sm text-gray-500">Create, update, close and delete CAPA records.</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary"><Plus className="w-4 h-4 mr-2" /> New CAPA</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Failed to load CAPA data. Please refresh.
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search CAPAs…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border-0 bg-transparent focus:ring-0 text-sm outline-none" />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filtered ?? []} loading={isLoading} onRowClick={openEditModal} />
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedCapa(null); reset(); }} title={selectedCapa ? 'Edit CAPA' : 'Create CAPA'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CAPA Number *</label>
              <input {...register('capaNumber')} className={`input-field ${formErrors.capaNumber ? 'border-red-400' : ''}`} placeholder="Enter CAPA number" />
              {formErrors.capaNumber && <p className="mt-1 text-xs text-red-600">{formErrors.capaNumber.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select {...register('capaType')} className="input-field">
                <option value="CORRECTIVE">CORRECTIVE</option>
                <option value="PREVENTIVE">PREVENTIVE</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
              <input {...register('projectId')} className="input-field" placeholder="UUID of project" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trial ID</label>
              <input {...register('trialId')} className="input-field" placeholder="UUID of trial" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Problem Description *</label>
            <textarea {...register('problemDescription')} rows={4} className={`input-field min-h-[120px] ${formErrors.problemDescription ? 'border-red-400' : ''}`} placeholder="Describe the issue" />
            {formErrors.problemDescription && <p className="mt-1 text-xs text-red-600">{formErrors.problemDescription.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Root Cause</label>
              <textarea {...register('rootCause')} rows={3} className="input-field" placeholder="Optional root cause" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Corrective Action</label>
              <textarea {...register('correctiveAction')} rows={3} className="input-field" placeholder="Optional corrective action" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preventive Action</label>
              <textarea {...register('preventiveAction')} rows={3} className="input-field" placeholder="Optional preventive action" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
              <input type="date" {...register('targetDate')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select {...register('status')} className="input-field">
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="IMPLEMENTED">IMPLEMENTED</option>
                <option value="VERIFIED">VERIFIED</option>
                <option value="CLOSED">CLOSED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setIsModalOpen(false); setSelectedCapa(null); reset(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.status === 'pending' || updateMutation.status === 'pending'} className="btn-primary disabled:opacity-50">
              {selectedCapa ? (updateMutation.status === 'pending' ? 'Saving…' : 'Save Changes') : (createMutation.status === 'pending' ? 'Creating…' : 'Create CAPA')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
