import React from 'react';
import { Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { useTeamCapacity } from '../../hooks/useEngineeringData';

export interface EngineerCapacityItem {
  id: string;
  engineerCode: string;
  name: string;
  proficiencyLevel: string;
  weeklyCapacityHours: number;
  currentUtilizationPercentage: number;
  status: 'AVAILABLE' | 'LOADED' | 'OVERLOADED' | 'ON_LEAVE';
  primarySkills: Array<{ skill: string; level: string }>;
}

interface DesignTeamCapacityPanelProps {
  engineers?: EngineerCapacityItem[];
  averageUtilization?: number;
  overloadedCount?: number;
}

export const DesignTeamCapacityPanel: React.FC<DesignTeamCapacityPanelProps> = ({
  engineers: propEngineers,
  averageUtilization: propUtilization,
  overloadedCount: propOverloadedCount,
}) => {
  const { data: capacity, isLoading } = useTeamCapacity({
    enabled: !propEngineers,
  });

  const displayEngineers: EngineerCapacityItem[] = propEngineers || (capacity?.engineers ?? []).map((eng) => ({
    id: eng.engineerId,
    engineerCode: `ENG-${eng.engineerId.slice(0, 4).toUpperCase()}`,
    name: eng.engineerName,
    proficiencyLevel: eng.role,
    weeklyCapacityHours: eng.maxWeeklyHours,
    currentUtilizationPercentage: eng.utilizationPercentage,
    status: eng.isOverloaded ? 'OVERLOADED' : eng.utilizationPercentage > 0 ? 'LOADED' : 'AVAILABLE',
    primarySkills: [{ skill: eng.role, level: 'CERTIFIED' }],
  }));

  const avgUtil = propUtilization ?? capacity?.overallUtilizationPercentage ?? 0;
  const overloaded = propOverloadedCount ?? capacity?.overloadedEngineersCount ?? 0;

  if (isLoading && !propEngineers) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl animate-pulse space-y-3">
        <div className="h-6 w-1/3 bg-slate-800 rounded" />
        <div className="h-16 bg-slate-800/60 rounded" />
        <div className="h-16 bg-slate-800/60 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm tracking-wide">
              Design Team Capacity & Skill Matrix
            </h3>
            <p className="text-xs text-slate-400">
              Avg Utilization:{' '}
              <span className="text-indigo-300 font-semibold font-mono">
                {avgUtil.toFixed(1)}%
              </span>
            </p>
          </div>
        </div>

        {overloaded > 0 ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            {overloaded} Overloaded
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            Capacity Balanced
          </span>
        )}
      </div>

      <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
        {displayEngineers.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            No design engineers allocated to this team capacity pool.
          </div>
        ) : (
          displayEngineers.map((eng) => {
            const isOverloaded = eng.status === 'OVERLOADED';
            return (
              <div
                key={eng.id}
                className={`p-3 rounded-lg border transition-all ${
                  isOverloaded
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : 'bg-slate-850/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-200">{eng.name}</span>
                    <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {eng.proficiencyLevel}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold ${
                      isOverloaded ? 'text-rose-400' : 'text-indigo-300'
                    }`}
                  >
                    {eng.currentUtilizationPercentage.toFixed(0)}% Util
                  </span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isOverloaded
                        ? 'bg-rose-500'
                        : eng.currentUtilizationPercentage >= 75
                        ? 'bg-amber-400'
                        : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(eng.currentUtilizationPercentage, 100)}%` }}
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {eng.primarySkills.map((sk, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/50 text-slate-400 font-mono"
                    >
                      {sk.skill.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
