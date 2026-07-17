import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const projectSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Max 100 characters'),
  customerName: z.string().min(2, 'Customer name is required').max(200, 'Max 200 characters'),
  productName: z.string().min(2, 'Product name is required').max(200, 'Max 200 characters'),
  targetDeliveryDate: z.string().optional().or(z.literal('')),
});

type ProjectForm = z.infer<typeof projectSchema>;

export function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/project').then(r => {
      const p = r.data;
      return Array.isArray(p) ? p : (p?.data ?? []);
    }),
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<ProjectForm>({ resolver: zodResolver(projectSchema) });

  // HIGH FIX H-1 + MEDIUM FIX M-6: Zod validation + optimistic updates
  const createMutation = useMutation({
    mutationFn: (data: ProjectForm) => api.post('/project', data),
    onMutate: async (_newData) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previous = queryClient.getQueryData(['projects']);
      queryClient.setQueryData(['projects'], (old: any) => [
        ...(old || []),
        { ..._newData, id: 'temp-' + Date.now(), stage: 'PROJECT_CREATED', healthStatus: 'GREEN', status: 'PENDING' },
      ]);
      return { previous };
    },
    onError: (err, _newData, context) => {
      queryClient.setQueryData(['projects'], context?.previous);
      toast.error((err as any)?.response?.data?.message || 'Failed to create project');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully');
      setIsModalOpen(false);
      reset();
    },
  });

  const filtered = projects?.filter((p: any) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.projectNumber?.toLowerCase().includes(search.toLowerCase()),
  );

  const activeProjects = projects?.length ?? 0;
  const completedProjects = projects?.filter((p: any) => p.healthStatus === 'GREEN').length ?? 0;
  const pendingProjects = projects?.filter((p: any) => p.status === 'PENDING').length ?? 0;

  const STAGE_COLORS: Record<string, string> = {
    ENQUIRY: 'bg-gray-100 text-gray-800',
    QUOTATION: 'bg-blue-100 text-blue-800',
    APPROVAL: 'bg-yellow-100 text-yellow-800',
    PROJECT_CREATED: 'bg-purple-100 text-purple-800',
    DESIGN_INITIATED: 'bg-indigo-100 text-indigo-800',
    MANUFACTURING: 'bg-orange-100 text-orange-800',
    INTERNAL_TRIAL: 'bg-pink-100 text-pink-800',
    CUSTOMER_TRIAL: 'bg-rose-100 text-rose-800',
    CAPA: 'bg-red-100 text-red-800',
    DISPATCH: 'bg-teal-100 text-teal-800',
    SERVICE: 'bg-green-100 text-green-800',
  };

  const HEALTH_COLORS: Record<string, string> = {
    GREEN:  'bg-green-100 text-green-800',
    YELLOW: 'bg-yellow-100 text-yellow-800',
    RED:    'bg-red-100 text-red-800',
  };

  const columns = [
    { key: 'projectNumber', header: 'Project #' },
    { key: 'name', header: 'Name' },
    {
      key: 'stage', header: 'Stage',
      render: (p: any) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STAGE_COLORS[p.stage] ?? 'bg-gray-100 text-gray-800'}`}>
          {(p.stage ?? '—').replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'healthStatus', header: 'Health',
      render: (p: any) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${HEALTH_COLORS[p.healthStatus] ?? 'bg-gray-100 text-gray-800'}`}>
          {p.healthStatus ?? '—'}
        </span>
      ),
    },
    {
      key: 'targetDeliveryDate', header: 'Target Date',
      render: (p: any) => p.targetDeliveryDate ? new Date(p.targetDeliveryDate).toLocaleDateString() : '—',
    },
  ];

  const onSubmit = (data: ProjectForm) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="mt-2 text-sm text-slate-400">Manage projects, delivery milestones, and team health in one place.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Project
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total projects</p>
          <p className="mt-3 text-3xl font-semibold text-white">{activeProjects}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Healthy</p>
          <p className="mt-3 text-3xl font-semibold text-white">{completedProjects}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pending</p>
          <p className="mt-3 text-3xl font-semibold text-white">{pendingProjects}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100 shadow-sm shadow-rose-500/10" role="status" aria-live="polite">
          <div className="inline-flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-200" /> Failed to load projects. Please try again later.
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="px-6 py-4">
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              aria-label="Search projects"
              placeholder="Search projects…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 input-field bg-slate-950/70 border-white/10 text-slate-100"
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filtered ?? []} loading={isLoading} />
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); reset(); }} title="Create New Project">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
            <input {...register('name')} className={`input-field ${formErrors.name ? 'border-red-400' : ''}`} placeholder="Enter project name" />
            {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name.message?.toString()}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
            <input {...register('customerName')} className={`input-field ${formErrors.customerName ? 'border-red-400' : ''}`} placeholder="Enter customer name" />
            {formErrors.customerName && <p className="mt-1 text-xs text-red-600">{formErrors.customerName.message?.toString()}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input {...register('productName')} className={`input-field ${formErrors.productName ? 'border-red-400' : ''}`} placeholder="Enter product name" />
            {formErrors.productName && <p className="mt-1 text-xs text-red-600">{formErrors.productName.message?.toString()}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Delivery Date</label>
            <input type="date" {...register('targetDeliveryDate')} className="input-field" />
          </div>
          <div className="text-xs text-gray-500">Project number is generated automatically by the backend.</div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setIsModalOpen(false); reset(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary disabled:opacity-50">
              {createMutation.isPending ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
