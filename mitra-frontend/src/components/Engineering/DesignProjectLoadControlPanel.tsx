import React from 'react';
import { Target, AlertCircle, RefreshCw } from 'lucide-react';
import { useProjectControl } from '../../hooks/useEngineeringData';

export interface ProjectLoadControlData {
  projectId: string;
  moldComplexityMultiplier: number;
  completionPercentage: number;
  scheduleHealth: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL';
  replanRequired: boolean;
  replanReason?: string;
  workload: {
    plannedUnits: number;
    actualUnits: number;
    remainingUnits: number;
    varianceUnits: number;
  };
  activeBlockersCount: number;
}

interface DesignProjectLoadControlPanelProps {
  projectId?: string;
  projectData?: ProjectLoadControlData;
  onRequestReplan?: () => void;
}

export const DesignProjectLoadControlPanel: React.FC<DesignProjectLoadControlPanelProps> = ({
  projectId,
  projectData: propData,
  onRequestReplan,
}) => {
  const { data: metrics, isLoading } = useProjectControl(projectId || '', {
    enabled: Boolean(projectId && !propData),
  });

  const activeData: ProjectLoadControlData = propData || {
    projectId: projectId || 'PRJ-DEFAULT',
    moldComplexityMultiplier: metrics?.complexityMultiplier ?? 1.35,
    completionPercentage: metrics ? Math.round((metrics.totalEstimatedHours / 100) * 10) : 35.7,
    scheduleHealth: (metrics?.slippageDays ?? 0) > 5 ? 'CRITICAL' : (metrics?.slippageDays ?? 0) > 0 ? 'AT_RISK' : 'ON_TRACK',
    replanRequired: (metrics?.slippageDays ?? 0) > 5,
    replanReason: (metrics?.slippageDays ?? 0) > 5 ? `Schedule slippage of ${metrics?.slippageDays} days detected.` : undefined,
    workload: {
      plannedUnits: metrics?.totalEstimatedHours ?? 54.0,
      actualUnits: (metrics?.totalEstimatedHours ?? 54.0) + (metrics?.slippageDays ?? 0) * 2,
      remainingUnits: 34.7,
      varianceUnits: (metrics?.slippageDays ?? 0) * 2,
    },
    activeBlockersCount: 0,
  };

  const isCritical = activeData.scheduleHealth === 'CRITICAL';
  const isAtRisk = activeData.scheduleHealth === 'AT_RISK';

  if (isLoading && !propData) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl animate-pulse space-y-3">
        <div className="h-6 w-1/2 bg-slate-800 rounded" />
        <div className="h-12 bg-slate-800/60 rounded" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-16 bg-slate-800/60 rounded" />
          <div className="h-16 bg-slate-800/60 rounded" />
          <div className="h-16 bg-slate-800/60 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm tracking-wide">
              Project Load Control & Delivery Health
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Project: <span className="text-cyan-300 font-bold">{activeData.projectId}</span> | Complexity:{' '}
              <span className="text-amber-300 font-bold">{activeData.moldComplexityMultiplier}x</span>
            </p>
          </div>
        </div>

        <span
          className={`px-2.5 py-1 text-xs rounded-full font-mono font-medium ${
            isCritical
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : isAtRisk
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          }`}
        >
          {activeData.scheduleHealth}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span>Completion Progress</span>
          <span className="font-mono font-bold text-cyan-300">{activeData.completionPercentage}%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-cyan-500 h-full rounded-full transition-all"
            style={{ width: `${Math.min(activeData.completionPercentage, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 pt-2">
        <div className="p-2.5 rounded bg-slate-850/60 border border-slate-800 text-center">
          <div className="text-[10px] text-slate-400">Planned</div>
          <div className="text-sm font-bold font-mono text-cyan-300 mt-0.5">
            {activeData.workload.plannedUnits}u
          </div>
        </div>
        <div className="p-2.5 rounded bg-slate-850/60 border border-slate-800 text-center">
          <div className="text-[10px] text-slate-400">Actual</div>
          <div className="text-sm font-bold font-mono text-emerald-300 mt-0.5">
            {activeData.workload.actualUnits}u
          </div>
        </div>
        <div className="p-2.5 rounded bg-slate-850/60 border border-slate-800 text-center">
          <div className="text-[10px] text-slate-400">Variance</div>
          <div
            className={`text-sm font-bold font-mono mt-0.5 ${
              activeData.workload.varianceUnits > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {activeData.workload.varianceUnits > 0 ? `+${activeData.workload.varianceUnits}` : activeData.workload.varianceUnits}u
          </div>
        </div>
      </div>

      {activeData.replanRequired && (
        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-amber-300">
            <AlertCircle className="w-4 h-4" />
            Replanning Recommended (Governed)
          </div>
          <p className="text-[11px] leading-relaxed text-amber-200/90">{activeData.replanReason}</p>
          <button
            onClick={onRequestReplan}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-medium hover:bg-amber-500/30 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Submit Governed Replan Request
          </button>
        </div>
      )}
    </div>
  );
};
