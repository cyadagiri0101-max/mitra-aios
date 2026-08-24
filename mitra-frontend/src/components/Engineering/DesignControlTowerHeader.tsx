import React from 'react';
import { Activity, CheckCircle, Clock, Cpu } from 'lucide-react';

interface DesignControlTowerHeaderProps {
  totalEngineers: number;
  totalCapacityHours: number;
  averageUtilization: number;
  overloadedEngineersCount: number;
  activeProjectsCount: number;
  projectsAtRiskCount: number;
  blockedStagesCount: number;
  pendingApprovalsCount: number;
  onOpenAcceptanceSimulator?: () => void;
  onOpenWhatIf?: () => void;
}

export const DesignControlTowerHeader: React.FC<DesignControlTowerHeaderProps> = ({
  totalEngineers,
  totalCapacityHours,
  averageUtilization,
  overloadedEngineersCount,
  activeProjectsCount,
  projectsAtRiskCount,
  blockedStagesCount,
  pendingApprovalsCount,
  onOpenAcceptanceSimulator,
  onOpenWhatIf,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 backdrop-blur-lg shadow-2xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 tracking-wide">
              Management Design Control Tower
            </h2>
            <p className="text-xs text-slate-400">
              Governed Engineering Delivery & Capacity Management (M12.1A)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAcceptanceSimulator}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 transition-all shadow-sm"
          >
            <Activity className="w-4 h-4" />
            Project Acceptance Simulator
          </button>
          <button
            onClick={onOpenWhatIf}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30 transition-all shadow-sm"
          >
            <Clock className="w-4 h-4" />
            What-If Planning
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3.5">
        <div className="p-3 rounded-lg bg-slate-850/60 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Design Team</div>
          <div className="text-xl font-bold font-mono text-slate-200 mt-1">{totalEngineers} Eng</div>
          <div className="text-[10px] text-slate-500 font-mono">{totalCapacityHours}h/wk Cap</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-850/60 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Avg Utilization</div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              averageUtilization > 90 ? 'text-amber-400' : 'text-cyan-300'
            }`}
          >
            {averageUtilization.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {averageUtilization <= 90 ? 'Healthy' : 'High Load'}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-850/60 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Overloaded</div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              overloadedEngineersCount > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {overloadedEngineersCount}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {overloadedEngineersCount > 0 ? 'Capacity Alert' : 'Balanced'}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-850/60 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Active Projects</div>
          <div className="text-xl font-bold font-mono text-slate-200 mt-1">{activeProjectsCount}</div>
          <div className="text-[10px] text-slate-500 font-mono">In Design</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-850/60 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Projects at Risk</div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              projectsAtRiskCount > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {projectsAtRiskCount}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Variance &gt; 15u</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-850/60 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Blocked Stages</div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              blockedStagesCount > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {blockedStagesCount}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Unresolved</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-850/60 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Customer Gates</div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              pendingApprovalsCount > 0 ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            {pendingApprovalsCount}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Pending Sign-off</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-850/60 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Governance</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle className="w-5 h-5" />
            100%
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Zero Auto-Mutate</div>
        </div>
      </div>
    </div>
  );
};
