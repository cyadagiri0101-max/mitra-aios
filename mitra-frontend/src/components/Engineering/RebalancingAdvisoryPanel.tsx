import React from 'react';
import { Sparkles, ArrowRight, UserCheck, CheckCircle } from 'lucide-react';
import type { BalancingRecommendationDto } from '../../services/engineeringApi';

interface RebalancingAdvisoryPanelProps {
  recommendations?: BalancingRecommendationDto[];
  isLoading?: boolean;
  onApplyRecommendation?: (rec: BalancingRecommendationDto) => void;
}

export const RebalancingAdvisoryPanel: React.FC<RebalancingAdvisoryPanelProps> = ({
  recommendations = [],
  isLoading,
  onApplyRecommendation,
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

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              Balancing Recommendations
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                isAutonomousDecision = false
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Deterministic Advisory Engine | Explicit Human Approval Required
            </p>
          </div>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-slate-500 text-center">
          <CheckCircle className="w-8 h-8 mb-2 text-emerald-400 opacity-60" />
          <p className="text-sm font-medium text-slate-300">No rebalancing actions currently recommended.</p>
          <p className="text-xs text-slate-500 mt-1">Resource allocation aligns with target capacity caps.</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
          {recommendations.map((rec, idx) => (
            <div
              key={rec.recommendationId || idx}
              className="p-3.5 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:border-cyan-500/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold font-mono">
                    {rec.type}
                  </span>
                  <span className="text-xs text-slate-300">
                    Shift <strong className="text-cyan-400">{rec.suggestedHours}h/week</strong>
                  </span>
                </div>
                {onApplyRecommendation && (
                  <button
                    onClick={() => onApplyRecommendation(rec)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-500/30 transition-colors flex items-center gap-1"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Review & Apply
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800 mb-2 font-mono">
                <span>{rec.sourceProjectId || 'Program Source'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-cyan-300">{rec.engineerName || rec.engineerId}</span>
                <span className="text-slate-500">|</span>
                <span className="text-emerald-400">Δ {rec.expectedUtilizationDelta}% Util</span>
              </div>

              <p className="text-[11px] text-slate-400">{rec.rationale}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
