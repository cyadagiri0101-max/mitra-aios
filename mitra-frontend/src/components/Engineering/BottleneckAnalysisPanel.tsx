import React from 'react';
import { ShieldAlert, CheckCircle, Info } from 'lucide-react';
import type { DetectedBottleneckDto } from '../../services/engineeringApi';

interface BottleneckAnalysisPanelProps {
  bottlenecks?: DetectedBottleneckDto[];
  overallHealthScore?: number;
  isLoading?: boolean;
}

export const BottleneckAnalysisPanel: React.FC<BottleneckAnalysisPanelProps> = ({
  bottlenecks = [],
  overallHealthScore = 100,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl animate-pulse space-y-3">
        <div className="h-6 w-1/3 bg-slate-800 rounded" />
        <div className="h-20 bg-slate-800/60 rounded" />
        <div className="h-20 bg-slate-800/60 rounded" />
      </div>
    );
  }

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              Portfolio Bottlenecks
              <span
                className={`text-xs px-2 py-0.5 rounded font-mono ${
                  overallHealthScore >= 90
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : overallHealthScore >= 70
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                Health: {overallHealthScore}/100
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {bottlenecks.length} Active Bottlenecks Detected | Advisory Only
            </p>
          </div>
        </div>
      </div>

      {bottlenecks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-emerald-400/80 text-center">
          <CheckCircle className="w-8 h-8 mb-2 text-emerald-400" />
          <p className="text-sm font-medium text-slate-200">Zero active capacity bottlenecks detected.</p>
          <p className="text-xs text-slate-400 mt-1">Portfolio workload and staffing allocations are balanced.</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
          {bottlenecks.map((btnk, idx) => (
            <div
              key={btnk.bottleneckId || idx}
              className="p-3.5 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/80 transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] px-2 py-0.5 rounded border font-semibold ${getSeverityBadge(btnk.severity)}`}>
                    {btnk.severity}
                  </span>
                  <span className="font-mono text-xs text-slate-300 font-medium">
                    {btnk.type}
                  </span>
                </div>
                {btnk.resourceId && (
                  <span className="text-xs font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                    {btnk.resourceId}
                  </span>
                )}
                {btnk.projectId && (
                  <span className="text-xs font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                    {btnk.projectId}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-200 mb-1">{btnk.description}</p>
              {btnk.impactSummary && (
                <p className="text-[11px] text-slate-400 mb-1.5">{btnk.impactSummary}</p>
              )}

              {btnk.recommendedAction && (
                <div className="mt-2 p-2 rounded bg-slate-900/60 border border-slate-700/40 text-[11px] text-cyan-300 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-cyan-400" />
                  <span>{btnk.recommendedAction}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
