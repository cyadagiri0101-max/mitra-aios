import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Plus, Search, FileCode, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const designPartSchema = z.object({
  partNumber: z.string().min(1, 'Part number is required').max(100),
  partName: z.string().min(2, 'Part name is required').max(200),
  materialGrade: z.string().optional(),
  projectId: z.string().optional(),
});

type DesignPartForm = z.infer<typeof designPartSchema>;

export function DesignPage() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: parts, isLoading, error } = useQuery({
    queryKey: ['design-parts'],
    queryFn: () => api.get('/design/parts').then(r => { const p = r.data; return Array.isArray(p) ? p : (p?.data ?? []); }),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const filtered = parts?.filter((p: any) => p.partNumber?.toLowerCase().includes(search.toLowerCase()) || p.name?.toLowerCase().includes(search.toLowerCase()));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<DesignPartForm>({ resolver: zodResolver(designPartSchema) });

  const createMutation = useMutation({
    mutationFn: (data: DesignPartForm) => api.post('/design/parts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-parts'] });
      toast.success('Design part created successfully');
      setIsModalOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create design part');
    },
  });

  const columns = [
    { key: 'partNumber', header: 'Part #' },
    { key: 'name', header: 'Name' },
    { key: 'revision', header: 'Rev' },
    { key: 'material', header: 'Material' },
    { key: 'status', header: 'Status', render: (p: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        p.status === 'released' ? 'bg-green-100 text-green-800' : p.status === 'in_review' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{p.status}</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Design Engineering</h1>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => toast('CAD Files — implement modal')}><FileCode className="w-4 h-4 mr-2" /> CAD Files</button>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Part</button>
        </div>
      </div>
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Failed to load design parts.</div>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Search className="w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Search parts..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border-0 bg-transparent focus:ring-0 text-sm" />
              </div>
            </CardHeader>
            <CardContent><DataTable columns={columns} data={filtered || []} loading={isLoading} /></CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader><CardTitle>Design Stats</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between"><span className="text-sm text-gray-500">Total Parts</span><span className="font-bold">{parts?.length || 0}</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-500">Released</span><span className="font-bold text-green-600">{parts?.filter((p: any) => p.status === 'released').length || 0}</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-500">In Review</span><span className="font-bold text-yellow-600">{parts?.filter((p: any) => p.status === 'in_review').length || 0}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); reset(); }} title="Create New Part">
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Part Number *</label>
            <input {...register('partNumber')} className={`input-field ${formErrors.partNumber ? 'border-red-400' : ''}`} placeholder="Enter part number" />
            {formErrors.partNumber && <p className="mt-1 text-xs text-red-600">{formErrors.partNumber.message?.toString()}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Part Name *</label>
            <input {...register('partName')} className={`input-field ${formErrors.partName ? 'border-red-400' : ''}`} placeholder="Enter part name" />
            {formErrors.partName && <p className="mt-1 text-xs text-red-600">{formErrors.partName.message?.toString()}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material Grade</label>
            <input {...register('materialGrade')} className="input-field" placeholder="e.g. 4140, 7075" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
            <input {...register('projectId')} className="input-field" placeholder="Optional project UUID" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setIsModalOpen(false); reset(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary disabled:opacity-50">
              {createMutation.isPending ? 'Creating…' : 'Create Part'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
