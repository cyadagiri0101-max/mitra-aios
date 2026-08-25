import React from 'react';
import { Layers, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import type { PortfolioDemandSummaryDto } from '../../services/engineeringApi';

interface PortfolioDemandPanelProps {
  demand?: PortfolioDemandSummaryDto;
  isLoading?: boolean;
}

export const PortfolioDemandPanel: React.FC<PortfolioDemandPanelProps> = ({
  demand,
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

  const projects = demand?.projects || [];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              Cross-Project Demand Breakdown
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                {demand?.totalDemandHours ? `${Math.round(demand.totalDemandHours)}h Total` : '0h'}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Active Programs: {demand?.activeProjectsCount || 0} | Deliverables: {demand?.totalDeliverablesCount || 0}
            </p>
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-slate-500 text-center">
          <AlertCircle className="w-8 h-8 mb-2 opacity-50 text-slate-400" />
          <p className="text-sm font-medium text-slate-400">No active project demand records found.</p>
          <p className="text-xs text-slate-500 mt-1">Configure project work packages to populate demand models.</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
          {projects.map((proj) => {
            const completionRatio =
              proj.totalDeliverablesCount > 0
                ? Math.round((proj.completedDeliverablesCount / proj.totalDeliverablesCount) * 100)
                : 0;

            return (
              <div
                key={proj.projectId}
                className="p-3.5 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/80 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-200">{proj.projectId}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300">
                      {proj.complexityTier}
                    </span>
                    {proj.varianceMultiplier !== 1.0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                        {proj.varianceMultiplier.toFixed(2)}x Multiplier
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-blue-400">
                      {Math.round(proj.estimatedTotalHours)}h
                    </span>
                    <span className="text-xs text-slate-400 block">
                      {proj.completedDeliverablesCount}/{proj.totalDeliverablesCount} items
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-700/40 rounded-full h-1.5 overflow-hidden mb-2">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, completionRatio)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    {completionRatio}% Completed
                  </span>
                  {proj.uncalibratedDeliverablesCount > 0 ? (
                    <span className="flex items-center gap-1 text-amber-400">
                      <Clock className="w-3 h-3" />
                      {proj.uncalibratedDeliverablesCount} Uncalibrated Items
                    </span>
                  ) : (
                    <span className="text-emerald-400">Calibrated</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
