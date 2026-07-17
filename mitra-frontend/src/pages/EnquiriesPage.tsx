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

const enquirySchema = z.object({
  enquiryNumber: z.string().min(1, 'Enquiry Number is required'),
  customerName: z.string().max(100).optional().or(z.literal('')),
  description: z.string().min(5, 'Description must be at least 5 characters'),
});

export function EnquiriesPage() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: res, isLoading, error } = useQuery({
    queryKey: ['enquiries'],
    queryFn: () => api.get('/commercial/enquiries').then(r => { const p = r.data; return Array.isArray(p) ? p : (p?.data ?? []); }),
    retry: 2, staleTime: 2 * 60 * 1000,
  });
  const enquiries = res ?? [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(enquirySchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/commercial/enquiries', data),
    onMutate: async (_newData) => {
      await queryClient.cancelQueries({ queryKey: ['enquiries'] });
      const previous = queryClient.getQueryData(['enquiries']);
      queryClient.setQueryData(['enquiries'], (old: any) => [
        ...(old || []),
        { ..._newData, id: 'temp-' + Date.now(), status: 'DRAFT', createdAt: new Date().toISOString() },
      ]);
      return { previous };
    },
    onError: (err, _newData, context) => {
      queryClient.setQueryData(['enquiries'], context?.previous);
      toast.error((err as any)?.response?.data?.message || 'Failed to create enquiry');
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['enquiries'] }); toast.success('Enquiry created'); setIsModalOpen(false); reset(); },
  });

  const filtered = enquiries.filter((e: any) =>
    e.enquiryNumber?.toLowerCase().includes(search.toLowerCase()) ||
    e.description?.toLowerCase().includes(search.toLowerCase()) ||
    e.customerName?.toLowerCase().includes(search.toLowerCase()),
  );

  const columns = [
    { key: 'enquiryNumber', header: 'Enquiry #' },
    { key: 'customerName', header: 'Customer' },
    { key: 'description', header: 'Description', render: (e: any) => <span title={e.description}>{(e.description ?? '').substring(0, 50)}{e.description?.length > 50 ? '…' : ''}</span> },
    { key: 'status', header: 'Status', render: (e: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        e.status === 'OPEN' ? 'bg-green-100 text-green-800' : e.status === 'QUOTED' ? 'bg-blue-100 text-blue-800' :
        e.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' : e.status === 'LOST' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{e.status}</span>
    )},
    { key: 'createdAt', header: 'Date', render: (e: any) => e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Enquiries</h1>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Enquiry</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Failed to load enquiries.</div>}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search enquiries…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border-0 bg-transparent focus:ring-0 text-sm" />
          </div>
        </CardHeader>
        <CardContent><DataTable columns={columns} data={filtered} loading={isLoading} /></CardContent>
      </Card>
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); reset(); }} title="Create New Enquiry">
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enquiry Number *</label>
            <input {...register('enquiryNumber')} className={`input-field ${errors.enquiryNumber ? 'border-red-400' : ''}`} placeholder="e.g. ENQ-2026-001" />
            {errors.enquiryNumber && <p className="mt-1 text-xs text-red-600">{errors.enquiryNumber.message?.toString()}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
            <input {...register('customerName')} className="input-field" placeholder="Enter customer name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea {...register('description')} className={`input-field ${errors.description ? 'border-red-400' : ''}`} rows={3} placeholder="Describe the enquiry..." />
            {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message?.toString()}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setIsModalOpen(false); reset(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary disabled:opacity-50">{createMutation.isPending ? 'Creating…' : 'Create Enquiry'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
