import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Wrench, Timer, ClipboardCheck, ShieldCheck, Scale, Calendar, Package,
} from 'lucide-react';
import { RequestsTab } from './service/RequestsTab';
import { VisitsTab } from './service/VisitsTab';
import { InstallationsTab } from './service/InstallationsTab';
import { WarrantyTab } from './service/WarrantyTab';
import { ClaimsTab } from './service/ClaimsTab';
import {
  listDispatchPlans, listInstallations, listWarranties, listServiceRequests,
  listVisits, listWarrantyClaims, unwrapList,
} from '../utils/serviceApi';
import { describeWarrantyCoverage } from '../utils/serviceStatus';
import { KpiTile } from './service/ui';
import { ChevronRight } from 'lucide-react';

type ServiceTab = 'dashboard' | 'requests' | 'visits' | 'installations' | 'warranty' | 'claims' | 'amc' | 'spareparts';

const TABS: Array<{ id: ServiceTab; label: string; icon: typeof Wrench }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'requests', label: 'Service Requests', icon: Wrench },
  { id: 'visits', label: 'Service Visits', icon: Timer },
  { id: 'installations', label: 'Installations', icon: ClipboardCheck },
  { id: 'warranty', label: 'Warranty', icon: ShieldCheck },
  { id: 'claims', label: 'Warranty Claims', icon: Scale },
  { id: 'amc', label: 'AMC Contracts', icon: Calendar },
  { id: 'spareparts', label: 'Spare Parts', icon: Package },
];

export function ServicePage() {
  const [activeTab, setActiveTab] = useState<ServiceTab>('dashboard');

  const dispatchQuery = useQuery({
    queryKey: ['dispatch-plans'],
    queryFn: () => listDispatchPlans().then(r => (Array.isArray(r.data) ? r.data : (r.data?.data ?? []))),
    retry: 2, staleTime: 2 * 60 * 1000,
  });
  const installationsQuery = useQuery({
    queryKey: ['service-installations'],
    queryFn: () => listInstallations({ limit: 500 }).then(r => unwrapList(r.data)),
    retry: 2, staleTime: 2 * 60 * 1000,
  });
  const warrantiesQuery = useQuery({
    queryKey: ['service-warranties'],
    queryFn: () => listWarranties({ limit: 500 }).then(r => unwrapList(r.data)),
    retry: 2, staleTime: 2 * 60 * 1000,
  });
  const requestsQuery = useQuery({
    queryKey: ['service-requests'],
    queryFn: () => listServiceRequests({ limit: 500 }).then(r => unwrapList(r.data)),
    retry: 2, staleTime: 2 * 60 * 1000,
  });
  const visitsQuery = useQuery({
    queryKey: ['service-visits'],
    queryFn: () => listVisits({ limit: 500 }).then(r => unwrapList(r.data)),
    retry: 2, staleTime: 2 * 60 * 1000,
  });
  const claimsQuery = useQuery({
    queryKey: ['service-claims'],
    queryFn: () => listWarrantyClaims({ limit: 500 }).then(r => unwrapList(r.data)),
    retry: 2, staleTime: 2 * 60 * 1000,
  });

  const loading = dispatchQuery.isLoading || installationsQuery.isLoading || warrantiesQuery.isLoading || requestsQuery.isLoading || visitsQuery.isLoading || claimsQuery.isLoading;

  const dispatches = dispatchQuery.data ?? [];
  const installations = installationsQuery.data?.items ?? [];
  const warranties = warrantiesQuery.data?.items ?? [];
  const requests = requestsQuery.data?.items ?? [];
  const visits = visitsQuery.data?.items ?? [];
  const claims = claimsQuery.data?.items ?? [];

  const activeDispatches = dispatches.filter((d: any) => ['PLANNING', 'PACKED', 'SHIPPED'].includes(d.status)).length;
  const pendingInstallations = installations.filter((i: any) => i.status === 'SCHEDULED' || i.status === 'IN_PROGRESS').length;
  const activeWarranties = warranties.filter((w: any) => describeWarrantyCoverage(w).state === 'ACTIVE').length;
  const openRequests = requests.filter((r: any) => ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(r.status)).length;
  const openClaims = claims.filter((c: any) => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW').length;
  const completedVisits = visits.filter((v: any) => v.status === 'COMPLETED').length;
  const approvedClaimsValue = claims.reduce((s: number, c: any) => s + Number(c.approvedAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Service Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Customer service lifecycle — installations, warranty coverage, field service and claim adjudication.
          </p>
        </div>
        <Link
          to="/service/lineage"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-300 hover:text-blue-200 border border-blue-500/30 hover:border-blue-500/50 rounded-xl px-3 py-2"
        >
          Project Service Digital Thread <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex gap-1 border-b border-white/10 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-mitra-600 text-mitra-700 text-white'
                  : 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile label="Active Dispatches" value={loading ? '…' : activeDispatches} tone="text-blue-300" hint="PLANNING / PACKED / SHIPPED" />
            <KpiTile label="Pending Installations" value={loading ? '…' : pendingInstallations} tone="text-amber-300" hint="Scheduled / in progress" />
            <KpiTile label="Active Warranties" value={loading ? '…' : activeWarranties} tone="text-emerald-300" hint="Coverage active" />
            <KpiTile label="Open Service Requests" value={loading ? '…' : openRequests} tone="text-cyan-300" hint="Open / acknowledged / in progress" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <KpiTile label="Open Warranty Claims" value={loading ? '…' : openClaims} tone="text-indigo-300" hint="Awaiting adjudication" />
            <KpiTile label="Completed Visits" value={loading ? '…' : completedVisits} tone="text-emerald-300" hint="Field visits completed" />
            <KpiTile label="Approved Claim Value" value={loading ? '…' : `₹${approvedClaimsValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} tone="text-rose-300" hint="Sum of approved amounts" />
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">Service Workload</h3>
              <Link to="/service/lineage" className="text-xs text-blue-300 hover:text-blue-200 inline-flex items-center gap-1">
                Digital thread <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'Dispatches', value: dispatches.length, hint: `${dispatches.filter((d: any) => d.status === 'DELIVERED').length} delivered` },
                { label: 'Installations', value: installations.length, hint: `${installations.filter((i: any) => i.status === 'COMPLETED').length} completed` },
                { label: 'Warranties', value: warranties.length, hint: `${warranties.filter((w: any) => w.status === 'EXPIRED').length} expired` },
                { label: 'Service Requests', value: requests.length, hint: `${requests.filter((r: any) => ['RESOLVED', 'CLOSED'].includes(r.status)).length} resolved` },
                { label: 'Service Visits', value: visits.length, hint: `${visits.reduce((s: number, v: any) => s + Number(v.travelHours ?? 0) + Number(v.serviceHours ?? 0), 0).toFixed(1)} h total effort` },
                { label: 'Warranty Claims', value: claims.length, hint: `${claims.filter((c: any) => c.status === 'APPROVED').length} approved` },
              ].map(item => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{loading ? '…' : item.value}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{item.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'requests' && <RequestsTab />}
      {activeTab === 'visits' && <VisitsTab />}
      {activeTab === 'installations' && <InstallationsTab />}
      {activeTab === 'warranty' && <WarrantyTab />}
      {activeTab === 'claims' && <ClaimsTab />}
      {activeTab === 'amc' && <AMCTab />}
      {activeTab === 'spareparts' && <SparePartsTab />}
    </div>
  );
}

import { listAmcContracts, listSpareParts } from '../utils/serviceApi';
import { StatusBadge, fmtMoney, ErrorBanner, SectionCard } from './service/ui';

function AMCTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['service-amc'],
    queryFn: () => listAmcContracts({ limit: 200 }).then(r => unwrapList(r.data)),
    retry: 2, staleTime: 2 * 60 * 1000,
  });
  const rows = data?.items ?? [];

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message="Failed to load AMC contracts." />}
      <SectionCard title="AMC Contracts" subtitle={`${data?.total ?? 0} records`}>
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-slate-900/90">
            <tr>
              {['Contract #', 'Type', 'Value', 'Start', 'End', 'Renewal', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {isLoading && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">Loading AMC contracts…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500 text-sm">No AMC contracts.</td></tr>}
            {!isLoading && rows.map((r: any) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-sm font-semibold text-slate-100">{r.contractNumber}</td>
                <td className="px-4 py-3 text-sm text-slate-300">{r.coverageType ?? '—'}</td>
                <td className="px-4 py-3 text-sm font-mono">{fmtMoney(r.contractValue)}</td>
                <td className="px-4 py-3 text-sm text-slate-300">{r.startDate ? new Date(r.startDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-300">{r.endDate ? new Date(r.endDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-300">{r.renewalDate ? new Date(r.renewalDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

function SparePartsTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['service-spareparts'],
    queryFn: () => listSpareParts({ limit: 200 }).then(r => unwrapList(r.data)),
    retry: 2, staleTime: 2 * 60 * 1000,
  });
  const rows = data?.items ?? [];

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message="Failed to load spare parts catalog." />}
      <SectionCard title="Spare Parts Catalog" subtitle={`${data?.total ?? 0} records`}>
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-slate-900/90">
            <tr>
              {['Part #', 'Name', 'Qty', 'Unit Price', 'Stock Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {isLoading && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">Loading spare parts…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500 text-sm">No spare parts in the catalog.</td></tr>}
            {!isLoading && rows.map((r: any) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-sm font-mono text-slate-300">{r.partNumber}</td>
                <td className="px-4 py-3 text-sm text-slate-100">{r.partName}</td>
                <td className="px-4 py-3 text-sm text-slate-300">{r.quantity ?? r.qty ?? 0}</td>
                <td className="px-4 py-3 text-sm font-mono">{fmtMoney(r.unitPrice)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.stockStatus ?? 'unknown'} fallback="bg-yellow-500/15 text-yellow-300 border-yellow-500/40" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}