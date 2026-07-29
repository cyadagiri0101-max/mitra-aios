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
  customerName: z.string().min(1, 'Customer name is required'),
  productName: z.string().min(1, 'Product name is required'),
  enquiryDate: z.string().min(1, 'Date is required'),
  customerContact: z.string().max(100).optional().or(z.literal('')),
  customerEmail: z.string().email().optional().or(z.literal('')),
  remarks: z.string().optional().or(z.literal('')),
  source: z.string().optional().or(z.literal('')),
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
    e.productName?.toLowerCase().includes(search.toLowerCase()) ||
    e.customerName?.toLowerCase().includes(search.toLowerCase()),
  );

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-yellow-100 text-yellow-800',
    SUBMITTED: 'bg-blue-100 text-blue-800',
    UNDER_REVIEW: 'bg-orange-100 text-orange-800',
    CONVERTED: 'bg-green-100 text-green-800',
    LOST: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  };

  const columns = [
    { key: 'enquiryNumber', header: 'Enquiry #' },
    { key: 'customerName', header: 'Customer' },
    { key: 'productName', header: 'Product' },
    { key: 'status', header: 'Status', render: (e: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[e.status] || 'bg-gray-100 text-gray-800'}`}>{e.status}</span>
    )},
    { key: 'enquiryDate', header: 'Date', render: (e: any) => e.enquiryDate ? new Date(e.enquiryDate).toLocaleDateString() : '—' },
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
            <input {...register('customerName')} className={`input-field ${errors.customerName ? 'border-red-400' : ''}`} placeholder="Enter customer name" />
            {errors.customerName && <p className="mt-1 text-xs text-red-600">{errors.customerName.message?.toString()}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input {...register('productName')} className={`input-field ${errors.productName ? 'border-red-400' : ''}`} placeholder="Enter product name" />
            {errors.productName && <p className="mt-1 text-xs text-red-600">{errors.productName.message?.toString()}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enquiry Date *</label>
            <input type="date" {...register('enquiryDate')} className={`input-field ${errors.enquiryDate ? 'border-red-400' : ''}`} />
            {errors.enquiryDate && <p className="mt-1 text-xs text-red-600">{errors.enquiryDate.message?.toString()}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
            <input {...register('customerContact')} className="input-field" placeholder="Contact person name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
            <input type="email" {...register('customerEmail')} className={`input-field ${errors.customerEmail ? 'border-red-400' : ''}`} placeholder="email@example.com" />
            {errors.customerEmail && <p className="mt-1 text-xs text-red-600">{errors.customerEmail.message?.toString()}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea {...register('remarks')} className="input-field" rows={3} placeholder="Describe the enquiry..." />
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
