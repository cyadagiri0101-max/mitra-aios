import React from 'react';
import { Users } from 'lucide-react';
import type { PortfolioCapacitySummaryDto } from '../../services/engineeringApi';

interface GlobalCapacityPanelProps {
  capacity?: PortfolioCapacitySummaryDto;
  isLoading?: boolean;
}

export const GlobalCapacityPanel: React.FC<GlobalCapacityPanelProps> = ({
  capacity,
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

  const engineers = capacity?.engineers || [];
  const overallUtil = capacity?.overallUtilizationPercentage || 0;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              Global Capacity & Utilization
              <span
                className={`text-xs px-2 py-0.5 rounded font-mono ${
                  overallUtil > 100
                    ? 'bg-rose-500/20 text-rose-300'
                    : overallUtil < 80
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {overallUtil.toFixed(1)}% Overall Load
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {capacity?.totalEngineersCount || 0} Engineers |{' '}
              {capacity?.totalAllocatedWeeklyCapacityHours || 0}h /{' '}
              {capacity?.totalAvailableWeeklyCapacityHours || 0}h Weekly
            </p>
          </div>
        </div>
      </div>

      {engineers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-slate-500 text-center">
          <Users className="w-8 h-8 mb-2 opacity-50 text-slate-400" />
          <p className="text-sm font-medium text-slate-400">No active engineering capacity profiles found.</p>
          <p className="text-xs text-slate-500 mt-1">Add tooling engineer profiles to monitor global capacity.</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
          {engineers.map((eng) => {
            const isOverloaded = eng.isOverloaded;
            const isUnderutilized = eng.isUnderutilized;

            const badgeColor = isOverloaded
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              : isUnderutilized
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

            const barColor = isOverloaded
              ? 'bg-rose-500'
              : isUnderutilized
              ? 'bg-amber-500'
              : 'bg-emerald-500';

            return (
              <div
                key={eng.engineerId}
                className="p-3.5 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/80 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-200">{eng.name}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300">
                      {eng.role}
                    </span>
                    <span className={`text-[11px] px-1.5 py-0.5 rounded border ${badgeColor}`}>
                      {isOverloaded ? 'Overloaded' : isUnderutilized ? 'Available' : 'Optimal'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-slate-200">
                      {eng.allocatedHoursPerWeek}h / {eng.baseWeeklyCapacityHours}h
                    </span>
                    <span className="text-xs font-mono text-slate-400 block">
                      {eng.utilizationPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-700/40 rounded-full h-1.5 overflow-hidden mb-2">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(100, eng.utilizationPercentage)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 truncate max-w-[240px]">
                    {(eng.skills || []).slice(0, 2).map((s, idx) => (
                      <span key={idx} className="bg-slate-800 px-1 py-0.5 rounded text-[10px] text-slate-300">
                        {s.skillType}
                      </span>
                    ))}
                  </div>
                  <span>{eng.activeAllocations.length} Active Assignments</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
