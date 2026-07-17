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

const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  contactPerson: z.string().max(100).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  industry: z.string().max(50).optional().or(z.literal('')),
});

type CustomerForm = z.infer<typeof customerSchema>;

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: customers, isLoading, error } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customer').then(r => { const p = r.data; return Array.isArray(p) ? p : (p?.data ?? []); }),
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });

  const { register, handleSubmit, reset, formState: { errors: formErrors } } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: CustomerForm) => api.post('/customer', data),
    onMutate: async (_newData) => {
      await queryClient.cancelQueries({ queryKey: ['customers'] });
      const previous = queryClient.getQueryData(['customers']);
      queryClient.setQueryData(['customers'], (old: any) => [...(old || []), { ..._newData, id: 'temp-' + Date.now() }]);
      return { previous };
    },
    onError: (err, _newData, context) => {
      queryClient.setQueryData(['customers'], context?.previous);
      toast.error((err as any)?.response?.data?.message || 'Failed to create customer');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created successfully');
      setIsModalOpen(false);
      reset();
    },
  });

  const filtered = customers?.filter((c: any) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()),
  );

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'contactPerson', header: 'Contact' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'industry', header: 'Industry' },
  ];

  const onSubmit = (data: CustomerForm) => createMutation.mutate(data);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Customer
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Failed to load customers. Please try again.
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border-0 bg-transparent focus:ring-0 text-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filtered || []} loading={isLoading} />
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); reset(); }} title="Create New Customer">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
            <input {...register('name')} className={`input-field ${formErrors.name ? 'border-red-400' : ''}`} placeholder="Enter customer name" />
            {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name.message?.toString()}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
            <input {...register('contactPerson')} className="input-field" placeholder="Enter contact person" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" {...register('email')} className={`input-field ${formErrors.email ? 'border-red-400' : ''}`} placeholder="customer@company.com" />
            {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email.message?.toString()}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input {...register('phone')} className="input-field" placeholder="+91 98765 43210" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
            <input {...register('industry')} className="input-field" placeholder="e.g. Automotive" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setIsModalOpen(false); reset(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary disabled:opacity-50">
              {createMutation.isPending ? 'Creating…' : 'Create Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
