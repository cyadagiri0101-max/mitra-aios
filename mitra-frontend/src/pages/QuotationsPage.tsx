import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Search, AlertTriangle, Send, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';

const acceptSchema = z.object({
  projectName: z.string().min(2, 'Project name must be at least 2 characters').max(200),
});

const rejectSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500),
});

export function QuotationsPage() {
  const [search, setSearch] = useState('');
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [actionModal, setActionModal] = useState<'accept' | 'reject' | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: quotations, isLoading, error } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => api.get('/commercial/quotations').then(r => { const p = r.data; return Array.isArray(p) ? p : (p?.data ?? []); }),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/commercial/quotations/${id}/send`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotations'] }); toast.success('Quotation sent to customer'); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to send quotation'),
  });

  const { register: registerAccept, handleSubmit: handleAccept, reset: resetAccept, formState: { errors: acceptErrors } } = useForm({
    resolver: zodResolver(acceptSchema),
  });

  const { register: registerReject, handleSubmit: handleReject, reset: resetReject, formState: { errors: rejectErrors } } = useForm({
    resolver: zodResolver(rejectSchema),
  });

  const acceptMutation = useMutation({
    mutationFn: (params: { id: string; projectName: string }) =>
      api.post(`/commercial/quotations/${params.id}/accept`, { projectName: params.projectName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation accepted! Project created.');
      setActionModal(null);
      resetAccept();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to accept quotation'),
  });

  const rejectMutation = useMutation({
    mutationFn: (params: { id: string; reason: string }) =>
      api.post(`/commercial/quotations/${params.id}/reject`, { reason: params.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation rejected');
      setActionModal(null);
      resetReject();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to reject quotation'),
  });

  const filtered = quotations?.filter((q: any) =>
    q.quotationNumber?.toLowerCase().includes(search.toLowerCase()) ||
    q.customerName?.toLowerCase().includes(search.toLowerCase()),
  );

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-yellow-100 text-yellow-800',
    SENT: 'bg-blue-100 text-blue-800',
    ACCEPTED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    EXPIRED: 'bg-gray-100 text-gray-800',
    PROJECT_CREATED: 'bg-purple-100 text-purple-800',
  };

  const columns = [
    { key: 'quotationNumber', header: 'Quotation #' },
    { key: 'customerName', header: 'Customer' },
    { key: 'totalAmount', header: 'Amount', render: (q: any) => `₹${Number(q.totalAmount)?.toLocaleString() || 0}` },
    {
      key: 'status', header: 'Status',
      render: (q: any) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[q.status] || 'bg-gray-100 text-gray-800'}`}>{q.status}</span>
      ),
    },
    {
      key: 'actions', header: 'Actions',
      render: (q: any) => (
        <div className="flex items-center gap-2">
          {q.status === 'DRAFT' && (
            <button onClick={(e) => { e.stopPropagation(); sendMutation.mutate(q.id); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Send to customer">
              <Send className="w-4 h-4" />
            </button>
          )}
          {q.status === 'SENT' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setSelectedQuotation(q); setActionModal('accept'); }} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors" title="Accept quotation">
                <CheckCircle className="w-4 h-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setSelectedQuotation(q); setActionModal('reject'); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors" title="Reject quotation">
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          {q.status === 'PROJECT_CREATED' && (
            <button onClick={(e) => { e.stopPropagation(); navigate('/projects'); }} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors" title="View project">
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
    { key: 'validUntil', header: 'Valid Until', render: (q: any) => q.validUntil ? new Date(q.validUntil).toLocaleDateString() : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
      </div>
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Failed to load quotations.</div>}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search quotations..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border-0 bg-transparent focus:ring-0 text-sm" />
          </div>
        </CardHeader>
        <CardContent><DataTable columns={columns} data={filtered || []} loading={isLoading} /></CardContent>
      </Card>

      <Modal isOpen={actionModal === 'accept'} onClose={() => { setActionModal(null); resetAccept(); }} title={`Accept Quotation ${selectedQuotation?.quotationNumber ?? ''}`}>
        <form onSubmit={handleAccept((data: any) => acceptMutation.mutate({ id: selectedQuotation?.id, projectName: data.projectName }))} className="space-y-4">
          <p className="text-sm text-gray-600">Accepting this quotation will create a new project.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
            <input {...registerAccept('projectName')} className={`input-field ${acceptErrors.projectName ? 'border-red-400' : ''}`} placeholder="Enter project name" />
            {acceptErrors.projectName && <p className="mt-1 text-xs text-red-600">{acceptErrors.projectName.message?.toString()}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setActionModal(null); resetAccept(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={acceptMutation.isPending} className="btn-primary disabled:opacity-50">
              {acceptMutation.isPending ? 'Creating Project…' : 'Accept & Create Project'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={actionModal === 'reject'} onClose={() => { setActionModal(null); resetReject(); }} title={`Reject Quotation ${selectedQuotation?.quotationNumber ?? ''}`}>
        <form onSubmit={handleReject((data: any) => rejectMutation.mutate({ id: selectedQuotation?.id, reason: data.reason }))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <textarea {...registerReject('reason')} className={`input-field ${rejectErrors.reason ? 'border-red-400' : ''}`} rows={3} placeholder="Why is this quotation being rejected?" />
            {rejectErrors.reason && <p className="mt-1 text-xs text-red-600">{rejectErrors.reason.message?.toString()}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setActionModal(null); resetReject(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={rejectMutation.isPending} className="btn-danger disabled:opacity-50">
              {rejectMutation.isPending ? 'Rejecting…' : 'Reject Quotation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
