import React from 'react';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { useHistoricalWorkload } from '../../hooks/useEngineeringData';

interface PlannedVsActualLoadPanelProps {
  projectId?: string;
  plannedUnits?: number;
  actualUnits?: number;
  varianceUnits?: number;
  modificationsByCategory?: Record<string, { count: number; actualWorkload: number }>;
}

export const PlannedVsActualLoadPanel: React.FC<PlannedVsActualLoadPanelProps> = ({
  projectId,
  plannedUnits: propPlanned,
  actualUnits: propActual,
  varianceUnits: propVariance,
  modificationsByCategory: propCategories,
}) => {
  const { data: historicalWorkloads } = useHistoricalWorkload(projectId, {
    enabled: Boolean(projectId && propPlanned === undefined),
  });

  const planned =
    propPlanned ??
    (historicalWorkloads && historicalWorkloads.length > 0
      ? historicalWorkloads.reduce((acc, hw) => acc + hw.plannedHours, 0)
      : 54.0);

  const actual =
    propActual ??
    (historicalWorkloads && historicalWorkloads.length > 0
      ? historicalWorkloads.reduce((acc, hw) => acc + hw.actualHours, 0)
      : 58.5);

  const variance = propVariance ?? Math.round((actual - planned) * 10) / 10;
  const isOverPlanned = variance > 0;

  const categories = propCategories || (historicalWorkloads && historicalWorkloads.length > 0
    ? historicalWorkloads.reduce((acc, hw) => {
        if (!acc[hw.componentType]) {
          acc[hw.componentType] = { count: 0, actualWorkload: 0 };
        }
        acc[hw.componentType].count += 1;
        acc[hw.componentType].actualWorkload += hw.actualHours;
        return acc;
      }, {} as Record<string, { count: number; actualWorkload: number }>)
    : {
        COOLING_MODIFICATION: { count: 1, actualWorkload: 5.5 },
      });

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm tracking-wide">
              Planned vs Actual Engineering Load
            </h3>
            <p className="text-xs text-slate-400">
              {projectId ? `Project: ${projectId} — ` : ''}Design & Tool Proving Variance Tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-mono font-bold ${
              isOverPlanned
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
            }`}
          >
            {isOverPlanned ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            Variance: {variance > 0 ? `+${variance}` : variance}u
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-slate-850/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 font-medium mb-1">Planned Load</div>
          <div className="text-xl font-bold font-mono text-cyan-300">{planned.toFixed(1)}u</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-850/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 font-medium mb-1">Actual Load</div>
          <div className="text-xl font-bold font-mono text-emerald-300">{actual.toFixed(1)}u</div>
        </div>
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        <div className="text-xs font-semibold text-slate-400 mb-1">Breakdown by Component / Modification Category:</div>
        {Object.entries(categories).map(([category, data]) => (
          <div
            key={category}
            className="flex items-center justify-between p-2 rounded bg-slate-850/30 border border-slate-800/80 text-xs font-mono"
          >
            <span className="text-slate-300">{category.replace(/_/g, ' ')}</span>
            <div className="flex items-center gap-3">
              <span className="text-slate-400">{data.count} items</span>
              <span className="font-bold text-amber-300">{data.actualWorkload.toFixed(1)}u</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
