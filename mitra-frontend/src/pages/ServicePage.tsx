import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Plus, Search, Wrench, Calendar, Package, ShieldCheck, XCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

type ServiceTab = 'tickets' | 'warranty' | 'amc' | 'spareparts' | 'visits';

const ticketSchema = z.object({
  requestNumber: z.string().min(1, 'Request Number is required'),
  requestType: z.string().min(1, 'Type is required'),
  issueDescription: z.string().min(5, 'Description must be at least 5 characters'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
});

const visitSchema = z.object({
  visitDate: z.string().min(1, 'Visit Date is required'),
  technician: z.string().min(1, 'Technician is required'),
  workDone: z.string().optional(),
  partsUsed: z.string().optional(),
});

export function ServicePage() {
  const [activeTab, setActiveTab] = useState<ServiceTab>('tickets');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['service-requests'],
    queryFn: () => api.get('/service/requests').then(r => { const p = r.data; return Array.isArray(p) ? p : (p?.data ?? []); }),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const { data: warrantyData } = useQuery({
    queryKey: ['service-warranty'],
    queryFn: () => api.get('/service/warranty').then(r => { const p = r.data; return Array.isArray(p) ? p : (p?.data ?? []); }),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const { data: amcData } = useQuery({
    queryKey: ['service-amc'],
    queryFn: () => api.get('/service/amc').then(r => { const p = r.data; return Array.isArray(p) ? p : (p?.data ?? []); }),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const { data: sparePartsData } = useQuery({
    queryKey: ['service-spareparts'],
    queryFn: () => api.get('/service/spare-parts').then(r => { const p = r.data; return Array.isArray(p) ? p : (p?.data ?? []); }),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const { data: visitsData } = useQuery({
    queryKey: ['service-visits'],
    queryFn: () => api.get('/service/visits').then(r => { const p = r.data; return Array.isArray(p) ? p : (p?.data ?? []); }),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const { register: registerTicket, handleSubmit: handleTicketSubmit, reset: resetTicket, formState: { errors: ticketErrors } } = useForm({
    resolver: zodResolver(ticketSchema),
    defaultValues: { requestNumber: '', requestType: '', issueDescription: '', priority: 'medium' as const },
  });

  const { register: registerVisit, handleSubmit: handleVisitSubmit, reset: resetVisit, formState: { errors: visitErrors } } = useForm({
    resolver: zodResolver(visitSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/service/requests', data),
    onMutate: async (_newData) => {
      await queryClient.cancelQueries({ queryKey: ['service-requests'] });
      const previous = queryClient.getQueryData(['service-requests']);
      queryClient.setQueryData(['service-requests'], (old: any[]) => [
        ...(old || []),
        { ..._newData, id: 'temp-' + Date.now(), status: 'open', createdAt: new Date().toISOString() },
      ]);
      return { previous };
    },
    onError: (err, _newData, context) => {
      queryClient.setQueryData(['service-requests'], context?.previous);
      toast.error((err as any)?.response?.data?.message || 'Failed to create request');
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['service-requests'] }); toast.success('Request created'); setIsModalOpen(false); resetTicket(); },
  });

  const closeTicketMutation = useMutation({
    mutationFn: (id: string) => api.post(`/service/requests/${id}/close`),
    onMutate: async (_id) => {
      await queryClient.cancelQueries({ queryKey: ['service-requests'] });
      const previous = queryClient.getQueryData(['service-requests']);
      queryClient.setQueryData(['service-requests'], (old: any[]) =>
        old?.map((r: any) => r.id === _id ? { ...r, status: 'resolved' } : r) ?? []
      );
      return { previous };
    },
    onError: (err, _id, context) => {
      queryClient.setQueryData(['service-requests'], context?.previous);
      toast.error((err as any)?.response?.data?.message || 'Failed to close ticket');
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['service-requests'] }); toast.success('Ticket closed'); },
  });

  const visitMutation = useMutation({
    mutationFn: (data: any) => api.post('/service/visits', data),
    onMutate: async (_newData) => {
      await queryClient.cancelQueries({ queryKey: ['service-visits'] });
      const previous = queryClient.getQueryData(['service-visits']);
      queryClient.setQueryData(['service-visits'], (old: any[]) => [
        ...(old || []),
        { ..._newData, id: 'temp-' + Date.now(), status: 'scheduled' },
      ]);
      return { previous };
    },
    onError: (err, _newData, context) => {
      queryClient.setQueryData(['service-visits'], context?.previous);
      toast.error((err as any)?.response?.data?.message || 'Failed to record visit');
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['service-visits'] }); toast.success('Visit recorded'); setIsVisitModalOpen(false); resetVisit(); },
  });

  const filtered = requests?.filter((r: any) =>
    r.requestNumber?.toLowerCase().includes(search.toLowerCase()) ||
    r.issueDescription?.toLowerCase().includes(search.toLowerCase()),
  );

  const ticketColumns = [
    { key: 'requestNumber', header: 'Request #' },
    { key: 'requestType', header: 'Type' },
    { key: 'priority', header: 'Priority', render: (r: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        r.priority === 'critical' ? 'bg-red-100 text-red-800' : r.priority === 'high' ? 'bg-orange-100 text-orange-800' :
        r.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
      }`}>{r.priority}</span>
    )},
    { key: 'status', header: 'Status', render: (r: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        r.status === 'resolved' ? 'bg-green-100 text-green-800' : r.status === 'open' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
      }`}>{r.status}</span>
    )},
    { key: 'createdAt', header: 'Date', render: (r: any) => new Date(r.createdAt).toLocaleDateString() },
    { key: 'actions', header: 'Actions', render: (r: any) => r.status === 'open' ? (
      <button onClick={(e) => { e.stopPropagation();
        if (window.confirm('Close this ticket?')) closeTicketMutation.mutate(r.id);
      }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-green-300 text-green-700 hover:bg-green-50" disabled={closeTicketMutation.isPending}>
        <XCircle className="w-3 h-3" /> Close
      </button>
    ) : <span className="text-xs text-gray-400">Closed</span> },
  ];

  const warrantyColumns = [
    { key: 'warrantyNumber', header: 'Warranty #' },
    { key: 'warrantyType', header: 'Type' },
    { key: 'startDate', header: 'Start', render: (r: any) => r.startDate ? new Date(r.startDate).toLocaleDateString() : '—' },
    { key: 'endDate', header: 'End', render: (r: any) => r.endDate ? new Date(r.endDate).toLocaleDateString() : '—' },
    { key: 'coverage', header: 'Coverage' },
    { key: 'status', header: 'Status', render: (r: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'active' ? 'bg-green-100 text-green-800' : r.status === 'expired' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{r.status}</span>
    )},
  ];

  const amcColumns = [
    { key: 'contractNumber', header: 'Contract #' },
    { key: 'amcType', header: 'Type' },
    { key: 'contractValue', header: 'Value', render: (r: any) => `₹${r.contractValue?.toLocaleString() || 0}` },
    { key: 'renewalDate', header: 'Renewal', render: (r: any) => r.renewalDate ? new Date(r.renewalDate).toLocaleDateString() : '—' },
    { key: 'status', header: 'Status', render: (r: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'active' ? 'bg-green-100 text-green-800' : r.status === 'expired' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{r.status}</span>
    )},
  ];

  const sparePartsColumns = [
    { key: 'partNumber', header: 'Part #' },
    { key: 'partName', header: 'Name' },
    { key: 'quantity', header: 'Qty' },
    { key: 'unitPrice', header: 'Unit Price', render: (r: any) => `₹${r.unitPrice?.toLocaleString() || 0}` },
    { key: 'stockStatus', header: 'Stock', render: (r: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.stockStatus === 'in_stock' ? 'bg-green-100 text-green-800' : r.stockStatus === 'low_stock' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{r.stockStatus?.replace('_', ' ')}</span>
    )},
  ];

  const visitColumns = [
    { key: 'visitNumber', header: 'Visit #' },
    { key: 'technician', header: 'Technician' },
    { key: 'visitDate', header: 'Date', render: (r: any) => r.visitDate ? new Date(r.visitDate).toLocaleDateString() : '—' },
    { key: 'workDone', header: 'Work Done', render: (r: any) => <span title={r.workDone}>{(r.workDone ?? '').substring(0, 40)}…</span> },
    { key: 'status', header: 'Status', render: (r: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'completed' ? 'bg-green-100 text-green-800' : r.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{r.status}</span>
    )},
  ];

  const tabs = [
    { id: 'tickets', label: 'Service Tickets', icon: Wrench },
    { id: 'warranty', label: 'Warranty', icon: ShieldCheck },
    { id: 'amc', label: 'AMC Contracts', icon: Calendar },
    { id: 'spareparts', label: 'Spare Parts', icon: Package },
    { id: 'visits', label: 'Service Visits', icon: Wrench },
  ];

  const getCurrent = () => {
    switch (activeTab) {
      case 'tickets': return { data: filtered || [], columns: ticketColumns, loading: isLoading, error };
      case 'warranty': return { data: warrantyData || [], columns: warrantyColumns, loading: false, error: null };
      case 'amc': return { data: amcData || [], columns: amcColumns, loading: false, error: null };
      case 'spareparts': return { data: sparePartsData || [], columns: sparePartsColumns, loading: false, error: null };
      case 'visits': return { data: visitsData || [], columns: visitColumns, loading: false, error: null };
    }
  };

  const current = getCurrent();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Service Management</h1>
        <button className="btn-primary" onClick={() => activeTab === 'visits' ? setIsVisitModalOpen(true) : setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> {activeTab === 'visits' ? 'Record Visit' : 'New Request'}
        </button>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as ServiceTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-mitra-600 text-mitra-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {current.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Failed to load data. Please try again.
        </div>
      )}

      {activeTab === 'tickets' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Search className="w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search requests..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border-0 bg-transparent focus:ring-0 text-sm" />
            </div>
          </CardHeader>
          <CardContent>
            <DataTable columns={current.columns} data={current.data} loading={current.loading} />
          </CardContent>
        </Card>
      )}

      {activeTab !== 'tickets' && (
        <Card>
          <CardContent className="p-0">
            <DataTable columns={current.columns} data={current.data} loading={current.loading} />
          </CardContent>
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetTicket(); }} title="Create Service Request">
        <form onSubmit={handleTicketSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Request Number *</label>
            <input {...registerTicket('requestNumber')} className={`input-field ${ticketErrors.requestNumber ? 'border-red-400' : ''}`} placeholder="e.g. SR-2026-001" />
            {ticketErrors.requestNumber && <p className="mt-1 text-xs text-red-600">{ticketErrors.requestNumber.message?.toString()}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Request Type *</label>
            <select {...registerTicket('requestType')} className={`input-field ${ticketErrors.requestType ? 'border-red-400' : ''}`}>
              <option value="">Select type</option>
              <option value="repair">Repair</option>
              <option value="maintenance">Maintenance</option>
              <option value="installation">Installation</option>
              <option value="warranty">Warranty Claim</option>
              <option value="amc">AMC Service</option>
            </select>
            {ticketErrors.requestType && <p className="mt-1 text-xs text-red-600">{ticketErrors.requestType.message?.toString()}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select {...registerTicket('priority')} className="input-field">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Description *</label>
            <textarea {...registerTicket('issueDescription')} className={`input-field ${ticketErrors.issueDescription ? 'border-red-400' : ''}`} rows={3} placeholder="Describe the issue..." />
            {ticketErrors.issueDescription && <p className="mt-1 text-xs text-red-600">{ticketErrors.issueDescription.message?.toString()}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setIsModalOpen(false); resetTicket(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary disabled:opacity-50">{createMutation.isPending ? 'Creating…' : 'Create Request'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isVisitModalOpen} onClose={() => { setIsVisitModalOpen(false); resetVisit(); }} title="Record Service Visit">
        <form onSubmit={handleVisitSubmit((data) => visitMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date *</label>
            <input type="date" {...registerVisit('visitDate')} className={`input-field ${visitErrors.visitDate ? 'border-red-400' : ''}`} />
            {visitErrors.visitDate && <p className="mt-1 text-xs text-red-600">{visitErrors.visitDate.message?.toString()}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technician *</label>
            <input {...registerVisit('technician')} className={`input-field ${visitErrors.technician ? 'border-red-400' : ''}`} placeholder="Technician name" />
            {visitErrors.technician && <p className="mt-1 text-xs text-red-600">{visitErrors.technician.message?.toString()}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Done</label>
            <textarea {...registerVisit('workDone')} className="input-field" rows={3} placeholder="Describe work performed..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parts Used</label>
            <input {...registerVisit('partsUsed')} className="input-field" placeholder="List parts used (comma separated)" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setIsVisitModalOpen(false); resetVisit(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={visitMutation.isPending} className="btn-primary disabled:opacity-50">{visitMutation.isPending ? 'Saving…' : 'Record Visit'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
