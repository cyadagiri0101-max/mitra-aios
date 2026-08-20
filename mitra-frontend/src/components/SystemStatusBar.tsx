import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../utils/api';

export interface SystemStatus {
  version: string;
}

interface HealthResponse {
  status: 'ok' | 'error';
}

interface LivenessResponse {
  status: string;
  uptime: number;
}

interface AiHealthResponse {
  enabled: boolean;
  available: boolean;
  model?: string;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function StatusIndicator({
  label, status,
}: { label: string; status: string }) {
  const displayMap: Record<string, string> = {
    healthy: 'Operational',
    connected: 'Connected',
    online: 'Online',
    running: 'Running',
    warning: 'Warning',
    degraded: 'Degraded',
    loading: 'Loading',
    reconnecting: 'Reconnecting',
    error: 'Error',
    disconnected: 'Disconnected',
    offline: 'Offline',
    stopped: 'Stopped',
  };
  const config: Record<string, { color: string; dotColor: string; icon: any }> = {
    healthy: { color: 'text-success', dotColor: '#2ECC71', icon: CheckCircle2 },
    connected: { color: 'text-success', dotColor: '#2ECC71', icon: CheckCircle2 },
    online: { color: 'text-success', dotColor: '#2ECC71', icon: CheckCircle2 },
    running: { color: 'text-success', dotColor: '#2ECC71', icon: CheckCircle2 },
    warning: { color: 'text-warning', dotColor: '#F39C12', icon: AlertCircle },
    degraded: { color: 'text-warning', dotColor: '#F39C12', icon: AlertCircle },
    loading: { color: 'text-accent', dotColor: '#64FFDA', icon: Loader2 },
    reconnecting: { color: 'text-accent', dotColor: '#64FFDA', icon: Loader2 },
    error: { color: 'text-error', dotColor: '#E74C3C', icon: AlertCircle },
    disconnected: { color: 'text-error', dotColor: '#E74C3C', icon: AlertCircle },
    offline: { color: 'text-error', dotColor: '#E74C3C', icon: AlertCircle },
    stopped: { color: 'text-secondary', dotColor: '#8892B0', icon: AlertCircle },
  };

  const c = config[status] || config.stopped;
  const StatusIcon = c.icon;

  return (
    <div className="flex items-center gap-1.5">
      <StatusIcon className={`w-3.5 h-3.5 ${c.color} ${status === 'loading' || status === 'reconnecting' ? 'animate-spin' : ''}`}
        style={c.color === 'text-success' ? { color: '#2ECC71' } : c.color === 'text-warning' ? { color: '#F39C12' } : c.color === 'text-error' ? { color: '#E74C3C' } : c.color === 'text-accent' ? { color: '#64FFDA' } : { color: '#8892B0' }} />
      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'loading' || status === 'reconnecting' ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: c.dotColor }} />
      <span className="text-xs font-medium capitalize" style={{ color: 'var(--color-text-secondary)' }}>{displayMap[status] || status}</span>
    </div>
  );
}

export function SystemStatusBar({ status }: { status: SystemStatus }) {
  const { data: health, isError: healthError, isLoading: healthLoading } = useQuery({
    queryKey: ['health-db'],
    queryFn: () => api.get('/health').then((r) => r.data as HealthResponse),
    refetchInterval: 60 * 1000,
    retry: 2,
  });

  const { data: liveness } = useQuery({
    queryKey: ['health-liveness'],
    queryFn: () => api.get('/health/liveness').then((r) => r.data as LivenessResponse),
    refetchInterval: 60 * 1000,
    retry: 2,
  });

  const { data: aiHealth, isLoading: aiLoading } = useQuery({
    queryKey: ['ai-health'],
    queryFn: () => api.get('/ai/health').then((r) => r.data as AiHealthResponse),
    refetchInterval: 60 * 1000,
    retry: 2,
  });

  const system = healthLoading ? 'loading' : health?.status === 'ok' && !healthError ? 'healthy' : 'error';
  const database = healthLoading ? 'reconnecting' : health?.status === 'ok' && !healthError ? 'connected' : 'disconnected';
  const ai = aiLoading
    ? 'loading'
    : aiHealth && aiHealth.enabled && aiHealth.available
      ? 'running'
      : 'stopped';
  const uptime = liveness && liveness.uptime != null ? formatUptime(liveness.uptime) : null;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="h-8 px-4 flex items-center justify-between flex-shrink-0"
      style={{ backgroundColor: 'var(--color-bg-surface)', borderTop: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-6">
        <StatusIndicator label="System Status" status={system} />
        <StatusIndicator label="Database" status={database} />
        <StatusIndicator label="AI Engine" status={ai} />
      </div>
      <div className="flex items-center gap-3">
        {uptime && (
          <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>Uptime: {uptime}</span>
        )}
        <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>MITRA {status.version}</span>
        <span className="text-xs" style={{ color: 'var(--color-border)' }}>Internal Use Only</span>
      </div>
    </motion.div>
  );
}