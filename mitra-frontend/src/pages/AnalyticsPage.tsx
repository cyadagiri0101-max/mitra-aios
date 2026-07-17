import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AlertTriangle } from 'lucide-react';

const fallbackProjectData = [
  { month: 'Jan', value: 4 }, { month: 'Feb', value: 6 }, { month: 'Mar', value: 8 },
  { month: 'Apr', value: 5 }, { month: 'May', value: 7 }, { month: 'Jun', value: 9 },
];

const fallbackQualityData = [
  { month: 'Jan', ncrs: 2, capas: 1 }, { month: 'Feb', ncrs: 3, capas: 2 },
  { month: 'Mar', ncrs: 1, capas: 1 }, { month: 'Apr', ncrs: 4, capas: 3 },
  { month: 'May', ncrs: 2, capas: 1 }, { month: 'Jun', ncrs: 1, capas: 0 },
];

export function AnalyticsPage() {
  const { data: stats, error, isLoading } = useQuery({
    queryKey: ['analytics-stats'],
    queryFn: () => api.get('/analytics/dashboard').then(r => r.data),
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  const projectData = stats?.projectTrends ?? fallbackProjectData;
  const qualityData = stats?.qualityMetrics ?? fallbackQualityData;

  const skeletonChart = (
    <div className="space-y-4 py-6">
      <div className="h-4 rounded-full bg-slate-800 shimmer" />
      <div className="h-72 rounded-3xl bg-slate-900 shimmer" />
      <div className="h-3 rounded-full bg-slate-800 shimmer w-5/6" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="mt-2 text-sm text-slate-400">Trend visualization and performance metrics for the MITRA dashboard.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-2 text-xs text-slate-200">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
          Live analytics updates
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100 shadow-sm shadow-amber-600/10" role="status" aria-live="polite">
          <div className="inline-flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-200" />
            <p>Analytics data could not be loaded. Showing fallback data.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Trends</CardTitle>
          </CardHeader>
          {isLoading ? (
            <CardContent>{skeletonChart}</CardContent>
          ) : (
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={projectData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155' }} itemStyle={{ color: '#fff' }} />
                  <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 text-sm text-slate-400">Production demand is tracking above historical baseline for the last quarter.</div>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quality Metrics</CardTitle>
          </CardHeader>
          {isLoading ? (
            <CardContent>{skeletonChart}</CardContent>
          ) : (
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={qualityData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155' }} itemStyle={{ color: '#fff' }} />
                  <Bar dataKey="ncrs" fill="#ef4444" name="NCRs" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="capas" fill="#f59e0b" name="CAPAs" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 text-sm text-slate-400">Quality events remain under control, with CAPAs trending flat.</div>
            </CardContent>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Metabase Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center text-slate-300">
            <p className="text-base font-semibold text-white">Embedded Metabase dashboards will appear here</p>
            <p className="text-sm text-slate-400 mt-2">Configure dashboard IDs in settings to enable real-time display.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
