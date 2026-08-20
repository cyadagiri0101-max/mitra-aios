import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import {
  mapTrends,
  summarizeDashboard,
  formatINR,
  DASHBOARD_REFRESH_MS,
  DASHBOARD_REFRESH_LABEL,
  type TrendsData,
  type DashboardSummary,
} from '../utils/dashboardMapping';

export function AnalyticsPage() {
  const {
    data: dashboard,
    error: dashboardError,
    isLoading: isDashboardLoading,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: () => api.get('/analytics/dashboard').then((r) => r.data),
    retry: 2,
    staleTime: DASHBOARD_REFRESH_MS,
  });

  const {
    data: trends,
    error: trendsError,
    isLoading: isTrendsLoading,
    refetch: refetchTrends,
  } = useQuery({
    queryKey: ['analytics-trends', 6],
    queryFn: () => api.get('/analytics/trends', { params: { months: 6 } }).then((r) => r.data),
    retry: 2,
    staleTime: DASHBOARD_REFRESH_MS,
  });

  const summary: DashboardSummary | null = summarizeDashboard(dashboard);
  const trendData: TrendsData = mapTrends(trends);
  const hasError = Boolean(dashboardError) || Boolean(trendsError);

  const skeletonChart = (
    <div className="space-y-4 py-6">
      <div className="h-4 rounded-full bg-slate-800 shimmer" />
      <div className="h-72 rounded-3xl bg-slate-900 shimmer" />
      <div className="h-3 rounded-full bg-slate-800 shimmer w-5/6" />
    </div>
  );

  const summaryCards = [
    { label: 'Total Projects', value: summary === null ? '—' : String(summary.totalProjects) },
    { label: 'Quotation Value', value: summary === null ? '—' : formatINR(summary.quotationValue) },
    { label: 'Open NCRs', value: summary === null ? '—' : String(summary.openNcrs) },
    { label: 'Open CAPAs', value: summary === null ? '—' : String(summary.openCapas) },
    { label: 'Service Closure Rate', value: summary === null ? '—' : `${summary.closureRatePct}%` },
    { label: 'Inspection Pass Rate', value: summary === null ? '—' : `${summary.passRatePct}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="mt-2 text-sm text-slate-400">Trend visualization from the authoritative MITRA analytics endpoints.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-2 text-xs text-slate-200">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
          {DASHBOARD_REFRESH_LABEL}
        </div>
      </div>

      {hasError && (
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100 shadow-sm shadow-amber-600/10" role="status" aria-live="polite">
          <div className="inline-flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-200" />
            <p>Analytics data could not be loaded. No fallback data is displayed.</p>
            <button
              type="button"
              onClick={() => {
                refetchDashboard();
                refetchTrends();
              }}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-500/20 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{card.label}</p>
            <p className="mt-2 text-xl font-bold text-white">{isDashboardLoading ? '…' : card.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Projects Created per Month</CardTitle>
          </CardHeader>
          {isTrendsLoading ? (
            <CardContent>{skeletonChart}</CardContent>
          ) : trendData.projectTrends.length === 0 ? (
            <CardContent>
              <div className="py-16 text-center text-sm text-slate-400">No project trend data for the selected period.</div>
            </CardContent>
          ) : (
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData.projectTrends} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155' }} itemStyle={{ color: '#fff' }} />
                  <Line type="monotone" dataKey="value" name="Projects" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 text-sm text-slate-400">Projects created per calendar month, from the project register.</div>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quality Events per Month</CardTitle>
          </CardHeader>
          {isTrendsLoading ? (
            <CardContent>{skeletonChart}</CardContent>
          ) : trendData.qualityTrends.length === 0 ? (
            <CardContent>
              <div className="py-16 text-center text-sm text-slate-400">No quality trend data for the selected period.</div>
            </CardContent>
          ) : (
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendData.qualityTrends} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155' }} itemStyle={{ color: '#fff' }} />
                  <Bar dataKey="ncrs" fill="#ef4444" name="NCRs" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="capas" fill="#f59e0b" name="CAPAs" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 text-sm text-slate-400">NCRs and CAPAs raised per calendar month, from quality records.</div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}