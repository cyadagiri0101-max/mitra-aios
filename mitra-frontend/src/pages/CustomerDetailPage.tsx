import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { KpiCard } from '../components/KpiCard';
import { ArrowLeft, Loader2, Users, MapPin, StickyNote, Activity as ActivityIcon, Plus, Trash2, Star, StarOff, Pin } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const TABS = ['Overview', 'Contacts', 'Addresses', 'Notes', 'Activities'] as const;

const contactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

const addressSchema = z.object({
  addressType: z.string().optional(),
  line1: z.string().min(2, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  isDefault: z.boolean().optional(),
});

const noteSchema = z.object({
  content: z.string().min(1, 'Note is required'),
  category: z.string().optional(),
  isPinned: z.boolean().optional(),
});

const activitySchema = z.object({
  activityType: z.string().min(1, 'Type is required'),
  description: z.string().min(1, 'Description is required'),
  referenceType: z.string().optional(),
});

const ACTIVITY_TYPES = ['CALL', 'EMAIL', 'MEETING', 'FOLLOW_UP', 'RFQ', 'QUOTATION', 'ORDER', 'SUPPORT', 'NOTE', 'SYSTEM', 'OTHER'];

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isAddressOpen, setIsAddressOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get(`/commercial/customers/${id}`).then(r => (r.data ?? {}) as any),
    retry: 2, staleTime: 30 * 1000, enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['customer', id] });
    queryClient.invalidateQueries({ queryKey: ['customers'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ action }: { action: 'activate' | 'deactivate' }) => api.post(`/commercial/customers/${id}/${action}`),
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Action failed'),
    onSuccess: (_res, { action }) => { invalidate(); toast.success(action === 'activate' ? 'Customer activated' : 'Customer deactivated'); },
  });

  const contactMutation = useMutation({
    mutationFn: (data: any) => api.post(`/commercial/customers/${id}/contacts`, {
      ...data,
      email: data.email || undefined,
      isPrimary: data.isPrimary || false,
    }),
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to add contact'),
    onSuccess: () => { invalidate(); toast.success('Contact added'); setIsContactOpen(false); },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (contactId: string) => api.post(`/commercial/customers/${id}/contacts/${contactId}/default`),
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to set default contact'),
    onSuccess: () => { invalidate(); toast.success('Primary contact updated'); },
  });

  const removeContactMutation = useMutation({
    mutationFn: (contactId: string) => api.delete(`/commercial/customers/${id}/contacts/${contactId}`),
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to remove contact'),
    onSuccess: () => { invalidate(); toast.success('Contact removed'); },
  });

  const addressMutation = useMutation({
    mutationFn: (data: any) => api.post(`/commercial/customers/${id}/addresses`, {
      ...data,
      addressType: data.addressType || 'BILLING',
      country: data.country || 'India',
      isDefault: data.isDefault || false,
    }),
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to add address'),
    onSuccess: () => { invalidate(); toast.success('Address added'); setIsAddressOpen(false); },
  });

  const removeAddressMutation = useMutation({
    mutationFn: (addressId: string) => api.delete(`/commercial/customers/${id}/addresses/${addressId}`),
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to remove address'),
    onSuccess: () => { invalidate(); toast.success('Address removed'); },
  });

  const noteMutation = useMutation({
    mutationFn: (data: any) => api.post(`/commercial/customers/${id}/notes`, {
      content: data.content,
      category: data.category || 'GENERAL',
      isPinned: data.isPinned || false,
    }),
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to add note'),
    onSuccess: () => { invalidate(); toast.success('Note added'); setIsNoteOpen(false); },
  });

  const removeNoteMutation = useMutation({
    mutationFn: (noteId: string) => api.delete(`/commercial/customers/${id}/notes/${noteId}`),
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to remove note'),
    onSuccess: () => { invalidate(); toast.success('Note removed'); },
  });

  const activityMutation = useMutation({
    mutationFn: (data: any) => api.post(`/commercial/customers/${id}/activities`, {
      activityType: data.activityType,
      description: data.description,
      referenceType: data.referenceType || undefined,
    }),
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to log activity'),
    onSuccess: () => { invalidate(); toast.success('Activity logged'); setIsActivityOpen(false); },
  });

  const contactForm = useForm<any>({ resolver: zodResolver(contactSchema) });
  const addressForm = useForm<any>({ resolver: zodResolver(addressSchema) });
  const noteForm = useForm<any>({ resolver: zodResolver(noteSchema) });
  const activityForm = useForm<any>({ resolver: zodResolver(activitySchema) });

  const contactColumns = [
    { key: 'name', header: 'Name', render: (c: any) => (
      <span className="flex items-center gap-2">
        {c.firstName} {c.lastName || ''}
        {c.isPrimary && <Star className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" />}
      </span>
    )},
    { key: 'designation', header: 'Designation', render: (c: any) => <span className="text-slate-400">{c.designation || '—'}</span> },
    { key: 'department', header: 'Department', render: (c: any) => <span className="text-slate-400">{c.department || '—'}</span> },
    { key: 'email', header: 'Email', render: (c: any) => <span className="text-slate-300">{c.email || '—'}</span> },
    { key: 'phone', header: 'Phone', render: (c: any) => <span className="text-slate-300">{c.phone || '—'}</span> },
    { key: 'actions', header: '', render: (c: any) => (
      <div className="flex items-center gap-2 justify-end">
        {!c.isPrimary && (
          <button onClick={() => setDefaultMutation.mutate(c.id)} className="text-yellow-400/70 hover:text-yellow-300 transition-colors" title="Set as primary"><StarOff className="w-4 h-4" /></button>
        )}
        <button onClick={() => { if (window.confirm('Remove this contact?')) removeContactMutation.mutate(c.id); }} className="text-red-400/70 hover:text-red-300 transition-colors" title="Remove contact"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  const addressColumns = [
    { key: 'addressType', header: 'Type', render: (a: any) => (
      <span className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/15 border border-cyan-400/30 text-cyan-300">{a.addressType}</span>
        {a.isDefault && <Pin className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" />}
      </span>
    )},
    { key: 'line1', header: 'Address', render: (a: any) => (
      <span className="text-slate-300">{[a.line1, a.line2, a.city, a.state, a.postalCode, a.country].filter(Boolean).join(', ')}</span>
    )},
    { key: 'actions', header: '', render: (a: any) => (
      <div className="flex justify-end">
        <button onClick={() => { if (window.confirm('Remove this address?')) removeAddressMutation.mutate(a.id); }} className="text-red-400/70 hover:text-red-300 transition-colors" title="Remove address"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  if (isLoading) {
    return <div className="flex items-center gap-3 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading customer…</div>;
  }
  if (error || !customer) {
    return <div className="bg-red-500/10 border border-red-400/30 rounded-2xl p-4 text-sm text-red-300">Failed to load customer.</div>;
  }

  const contacts = customer.contacts ?? [];
  const addresses = customer.addresses ?? [];
  const notes = customer.notes ?? [];
  const activities = customer.activities ?? [];
  const attachments = customer.attachments ?? [];
  const primary = contacts.find((c: any) => c.isPrimary);

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/customers')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{customer.name}</h1>
            {customer.code && <span className="font-mono text-sm text-slate-500">{customer.code}</span>}
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${customer.status === 'active' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30' : 'bg-gray-500/15 text-gray-300 border-gray-400/30'}`}>
              {customer.status}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">{customer.industry || '—'} · Source: {customer.source} · Since {new Date(customer.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => statusMutation.mutate({ action: customer.status === 'active' ? 'deactivate' : 'activate' })}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 transition-colors"
          >
            {customer.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <KpiCard title="Contacts" value={contacts.length} icon={Users} variant="info" loading={!customer} insight={primary ? `Primary: ${primary.firstName} ${primary.lastName || ''}` : 'No primary contact set'} updatedAt={new Date().toLocaleDateString()} />
        <KpiCard title="Addresses" value={addresses.length} icon={MapPin} variant="success" loading={!customer} insight="Billing / shipping / registered" updatedAt={new Date().toLocaleDateString()} />
        <KpiCard title="Notes" value={notes.length} icon={StickyNote} variant="warning" loading={!customer} insight={notes.some((n: any) => n.isPinned) ? 'Pinned notes present' : 'No pinned notes'} updatedAt={new Date().toLocaleDateString()} />
        <KpiCard title="Activities" value={activities.length} icon={ActivityIcon} variant="danger" loading={!customer} insight={`${attachments.length} attachment${attachments.length === 1 ? '' : 's'}`} updatedAt={new Date().toLocaleDateString()} />
      </div>

      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Company Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex justify-between"><span className="text-slate-500">Industry</span><span className="text-slate-200">{customer.industry || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">GST Number</span><span className="text-slate-200">{customer.gstNumber || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Tax ID</span><span className="text-slate-200">{customer.taxId || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Registration No.</span><span className="text-slate-200">{customer.registrationNumber || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Website</span><span className="text-slate-200">{customer.website || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Credit Limit</span><span className="text-slate-200">{customer.creditLimit != null ? `₹${Number(customer.creditLimit).toLocaleString('en-IN')}` : '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Payment Terms</span><span className="text-slate-200">{customer.paymentTerms || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Rating</span><span className="text-slate-200">{customer.rating != null ? '★'.repeat(customer.rating) : '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="text-slate-200">{customer.phone || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="text-slate-200">{customer.email || '—'}</span></div>
              </div>
              {customer.paymentTerms && (
                <div className="pt-2 border-t border-white/10">
                  <p className="text-slate-500 mb-1">Payment Terms</p>
                  <p className="text-slate-200">{customer.paymentTerms}</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-slate-500">No activities recorded yet</p>
              ) : (
                <ul className="space-y-3">
                  {(activities as any[]).slice(0, 6).map((a: any) => (
                    <li key={a.id} className="text-xs">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[10px] font-medium">{a.activityType}</span>
                        <span className="text-slate-500">{new Date(a.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="mt-1 text-slate-300">{a.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'Contacts' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Contacts</CardTitle>
              <button onClick={() => { contactForm.reset(); setIsContactOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/25 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Contact
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable columns={contactColumns} data={contacts} loading={isLoading} />
          </CardContent>
        </Card>
      )}

      {tab === 'Addresses' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Addresses</CardTitle>
              <button onClick={() => { addressForm.reset(); setIsAddressOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/25 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Address
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable columns={addressColumns} data={addresses} loading={isLoading} />
          </CardContent>
        </Card>
      )}

      {tab === 'Notes' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Notes</CardTitle>
              <button onClick={() => { noteForm.reset(); setIsNoteOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/25 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Note
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <p className="text-sm text-slate-500">No notes yet</p>
            ) : (
              <div className="space-y-3">
                {(notes as any[]).map((n: any) => (
                  <div key={n.id} className={`rounded-xl border p-4 ${n.isPinned ? 'bg-yellow-500/5 border-yellow-400/25' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {n.isPinned && <Pin className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" />}
                        <span className="text-xs font-medium text-slate-400">{n.category || 'GENERAL'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleDateString()}</span>
                        <button onClick={() => { if (window.confirm('Remove this note?')) removeNoteMutation.mutate(n.id); }} className="text-red-400/70 hover:text-red-300 transition-colors" title="Remove note"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-200">{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'Activities' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Activity Log</CardTitle>
              <button onClick={() => { activityForm.reset(); setIsActivityOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/25 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Log Activity
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-slate-500">No activities recorded</p>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-2 top-1 bottom-1 w-px bg-white/10" />
                <ul className="space-y-4">
                  {(activities as any[]).map((a: any) => (
                    <li key={a.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      <div className="flex items-center justify-between gap-3">
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[10px] font-medium">{a.activityType}</span>
                        <span className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-1.5 text-sm text-slate-200">{a.description}</p>
                      {a.referenceType && <p className="mt-0.5 text-xs text-slate-500">Ref: {a.referenceType}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Modal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} title="Add Contact">
        <form onSubmit={contactForm.handleSubmit((data) => contactMutation.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input {...contactForm.register('firstName')} className="input-field" placeholder="John" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input {...contactForm.register('lastName')} className="input-field" placeholder="Smith" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" {...contactForm.register('email')} className="input-field" placeholder="john@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input {...contactForm.register('phone')} className="input-field" placeholder="+91 98765 43210" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
              <input {...contactForm.register('designation')} className="input-field" placeholder="Procurement Head" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input {...contactForm.register('department')} className="input-field" placeholder="Purchase" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...contactForm.register('isPrimary')} className="w-4 h-4 rounded border-gray-300" />
            Set as primary contact
          </label>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsContactOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={contactMutation.isPending} className="btn-primary disabled:opacity-50">{contactMutation.isPending ? 'Adding…' : 'Add Contact'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAddressOpen} onClose={() => setIsAddressOpen(false)} title="Add Address">
        <form onSubmit={addressForm.handleSubmit((data) => addressMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select {...addressForm.register('addressType')} className="input-field">
              <option value="BILLING">BILLING</option>
              <option value="SHIPPING">SHIPPING</option>
              <option value="REGISTERED">REGISTERED</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
            <input {...addressForm.register('line1')} className="input-field" placeholder="Plot 12, MIDC Industrial Estate" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
            <input {...addressForm.register('line2')} className="input-field" placeholder="Phase II" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input {...addressForm.register('city')} className="input-field" placeholder="Pune" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
              <input {...addressForm.register('state')} className="input-field" placeholder="Maharashtra" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
              <input {...addressForm.register('postalCode')} className="input-field" placeholder="411019" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input {...addressForm.register('country')} className="input-field" placeholder="India" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...addressForm.register('isDefault')} className="w-4 h-4 rounded border-gray-300" />
            Set as default address
          </label>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsAddressOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={addressMutation.isPending} className="btn-primary disabled:opacity-50">{addressMutation.isPending ? 'Adding…' : 'Add Address'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isNoteOpen} onClose={() => setIsNoteOpen(false)} title="Add Note">
        <form onSubmit={noteForm.handleSubmit((data) => noteMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note *</label>
            <textarea {...noteForm.register('content')} className="input-field" rows={3} placeholder="e.g. Prefers email communication for all commercial matters" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input {...noteForm.register('category')} className="input-field" placeholder="GENERAL" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...noteForm.register('isPinned')} className="w-4 h-4 rounded border-gray-300" />
            Pin this note
          </label>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsNoteOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={noteMutation.isPending} className="btn-primary disabled:opacity-50">{noteMutation.isPending ? 'Adding…' : 'Add Note'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isActivityOpen} onClose={() => setIsActivityOpen(false)} title="Log Activity">
        <form onSubmit={activityForm.handleSubmit((data) => activityMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select {...activityForm.register('activityType')} className="input-field">
              <option value="">Select…</option>
              {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea {...activityForm.register('description')} className="input-field" rows={3} placeholder="What happened?" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Type</label>
            <input {...activityForm.register('referenceType')} className="input-field" placeholder="e.g. rfq" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsActivityOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={activityMutation.isPending} className="btn-primary disabled:opacity-50">{activityMutation.isPending ? 'Logging…' : 'Log Activity'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
