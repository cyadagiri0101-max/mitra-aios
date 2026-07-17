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

const productSchema = z.object({
  name: z.string().min(2, 'Name is required').max(200),
  productCode: z.string().min(1, 'Product code is required').max(30),
  category: z.string().max(100).optional().or(z.literal('')),
  supplierName: z.string().max(200).optional().or(z.literal('')),
  supplierId: z.string().uuid('Supplier ID must be a valid UUID').optional().or(z.literal('')),
  description: z.string().max(2000).optional().or(z.literal('')),
  unitPrice: z.number().min(0).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

type ProductForm = z.infer<typeof productSchema>;

type ProductRecord = {
  id: string;
  productCode: string;
  name: string;
  category?: string | null;
  supplierName?: string | null;
  supplierId?: string | null;
  description?: string | null;
  unitPrice?: number | null;
  status: 'ACTIVE' | 'INACTIVE';
};

export function ProductsPage() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null);
  const queryClient = useQueryClient();

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then(r => { const payload = r.data; return Array.isArray(payload) ? payload : (payload?.data ?? []); }),
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: ProductForm) => api.post('/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
      setIsModalOpen(false);
      setSelectedProduct(null);
      reset();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create product'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProductForm & { id: string }) => api.patch(`/products/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully');
      setIsModalOpen(false);
      setSelectedProduct(null);
      reset();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update product'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
      setSelectedProduct(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete product'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<ProductForm>({ resolver: zodResolver(productSchema) });

  const filtered = (products ?? []).filter((item: ProductRecord) =>
    item.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.productCode?.toLowerCase().includes(search.toLowerCase()) ||
    item.category?.toLowerCase().includes(search.toLowerCase()) ||
    item.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
    item.status?.toLowerCase().includes(search.toLowerCase()),
  );

  const openCreateModal = () => {
    setSelectedProduct(null);
    reset({
      name: '',
      productCode: '',
      category: '',
      supplierName: '',
      supplierId: '',
      description: '',
      unitPrice: undefined,
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: ProductRecord) => {
    setSelectedProduct(product);
    reset({
      name: product.name,
      productCode: product.productCode,
      category: product.category ?? '',
      supplierName: product.supplierName ?? '',
      supplierId: product.supplierId ?? '',
      description: product.description ?? '',
      unitPrice: product.unitPrice ?? undefined,
      status: product.status,
    });
    setIsModalOpen(true);
  };

  const onSubmit = (data: ProductForm) => {
    if (selectedProduct) {
      updateMutation.mutate({ ...data, id: selectedProduct.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    { key: 'productCode', header: 'Code' },
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Category' },
    { key: 'supplierName', header: 'Supplier' },
    { key: 'unitPrice', header: 'Unit Price', render: (item: ProductRecord) => item.unitPrice != null ? `₹${item.unitPrice.toFixed(2)}` : '—' },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: 'Actions', render: (item: ProductRecord) => (
      <div className="flex items-center gap-2">
        <button type="button" onClick={(e) => { e.stopPropagation(); openEditModal(item); }} className="text-sky-600 hover:text-sky-800">Edit</button>
        <button type="button" onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this product?')) deleteMutation.mutate(item.id); }} className="text-rose-600 hover:text-rose-800">Delete</button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">Manage product master data for customer programs and design projects.</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary"><Plus className="w-4 h-4 mr-2" /> New Product</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Failed to load products. Please refresh.
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border-0 bg-transparent focus:ring-0 text-sm outline-none" />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filtered ?? []} loading={isLoading} onRowClick={openEditModal} />
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedProduct(null); reset(); }} title={selectedProduct ? 'Edit Product' : 'Add Product'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
              <input {...register('name')} className={`input-field ${formErrors.name ? 'border-red-400' : ''}`} placeholder="Enter product name" />
              {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Code *</label>
              <input {...register('productCode')} className={`input-field ${formErrors.productCode ? 'border-red-400' : ''}`} placeholder="Enter product code" />
              {formErrors.productCode && <p className="mt-1 text-xs text-red-600">{formErrors.productCode.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input {...register('category')} className="input-field" placeholder="e.g. Hydraulic" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
              <input {...register('supplierName')} className="input-field" placeholder="Supplier name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier ID</label>
              <input {...register('supplierId')} className={`input-field ${formErrors.supplierId ? 'border-red-400' : ''}`} placeholder="Optional supplier UUID" />
              {formErrors.supplierId && <p className="mt-1 text-xs text-red-600">{formErrors.supplierId.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
              <input type="number" step="0.01" {...register('unitPrice', { valueAsNumber: true })} className="input-field" placeholder="0.00" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...register('description')} rows={3} className="input-field" placeholder="Enter product description" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select {...register('status')} className="input-field">
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setIsModalOpen(false); setSelectedProduct(null); reset(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.status === 'pending' || updateMutation.status === 'pending'} className="btn-primary disabled:opacity-50">
              {selectedProduct ? (updateMutation.status === 'pending' ? 'Saving…' : 'Save Changes') : (createMutation.status === 'pending' ? 'Creating…' : 'Create Product')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
