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

const supplierSchema = z.object({
  name: z.string().min(2, 'Name is required').max(200),
  supplierCode: z.string().min(1, 'Supplier code is required').max(30),
  contactPerson: z.string().max(100).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  website: z.string().max(255).optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

type SupplierForm = z.infer<typeof supplierSchema>;

type SupplierRecord = {
  id: string;
  supplierCode: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
};

export function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRecord | null>(null);
  const queryClient = useQueryClient();

  const { data: suppliers, isLoading, error } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers').then(r => { const payload = r.data; return Array.isArray(payload) ? payload : (payload?.data ?? []); }),
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: SupplierForm) => api.post('/suppliers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier created successfully');
      setIsModalOpen(false);
      setSelectedSupplier(null);
      reset();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create supplier'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: SupplierForm & { id: string }) => api.patch(`/suppliers/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier updated successfully');
      setIsModalOpen(false);
      setSelectedSupplier(null);
      reset();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update supplier'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier deleted successfully');
      setSelectedSupplier(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete supplier'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<SupplierForm>({ resolver: zodResolver(supplierSchema) });

  const filtered = (suppliers ?? []).filter((item: SupplierRecord) =>
    item.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.supplierCode?.toLowerCase().includes(search.toLowerCase()) ||
    item.email?.toLowerCase().includes(search.toLowerCase()) ||
    item.status?.toLowerCase().includes(search.toLowerCase()),
  );

  const openCreateModal = () => {
    setSelectedSupplier(null);
    reset({
      name: '',
      supplierCode: '',
      contactPerson: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: SupplierRecord) => {
    setSelectedSupplier(supplier);
    reset({
      name: supplier.name,
      supplierCode: supplier.supplierCode,
      contactPerson: supplier.contactPerson ?? '',
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
      website: supplier.website ?? '',
      address: supplier.address ?? '',
      status: supplier.status,
    });
    setIsModalOpen(true);
  };

  const onSubmit = (data: SupplierForm) => {
    if (selectedSupplier) {
      updateMutation.mutate({ ...data, id: selectedSupplier.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    { key: 'supplierCode', header: 'Code' },
    { key: 'name', header: 'Name' },
    { key: 'contactPerson', header: 'Contact' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: 'Actions', render: (item: SupplierRecord) => (
      <div className="flex items-center gap-2">
        <button type="button" onClick={(e) => { e.stopPropagation(); openEditModal(item); }} className="text-sky-600 hover:text-sky-800">Edit</button>
        <button type="button" onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this supplier?')) deleteMutation.mutate(item.id); }} className="text-rose-600 hover:text-rose-800">Delete</button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500">Manage supplier master data for procurement and sourcing.</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary"><Plus className="w-4 h-4 mr-2" /> New Supplier</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Failed to load suppliers. Please refresh.
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search suppliers…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border-0 bg-transparent focus:ring-0 text-sm outline-none" />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filtered ?? []} loading={isLoading} onRowClick={openEditModal} />
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedSupplier(null); reset(); }} title={selectedSupplier ? 'Edit Supplier' : 'Add Supplier'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
              <input {...register('name')} className={`input-field ${formErrors.name ? 'border-red-400' : ''}`} placeholder="Enter supplier name" />
              {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Code *</label>
              <input {...register('supplierCode')} className={`input-field ${formErrors.supplierCode ? 'border-red-400' : ''}`} placeholder="Enter supplier code" />
              {formErrors.supplierCode && <p className="mt-1 text-xs text-red-600">{formErrors.supplierCode.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <input {...register('contactPerson')} className="input-field" placeholder="Enter contact person" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" {...register('email')} className={`input-field ${formErrors.email ? 'border-red-400' : ''}`} placeholder="supplier@example.com" />
              {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input {...register('phone')} className="input-field" placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input {...register('website')} className="input-field" placeholder="https://supplier.example.com" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea {...register('address')} rows={3} className="input-field" placeholder="Enter supplier address" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select {...register('status')} className="input-field">
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setIsModalOpen(false); setSelectedSupplier(null); reset(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.status === 'pending' || updateMutation.status === 'pending'} className="btn-primary disabled:opacity-50">
              {selectedSupplier ? (updateMutation.status === 'pending' ? 'Saving…' : 'Save Changes') : (createMutation.status === 'pending' ? 'Creating…' : 'Create Supplier')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
