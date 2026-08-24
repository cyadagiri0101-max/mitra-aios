import React, { useState } from 'react';
import { X, Play, HelpCircle, AlertCircle, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useSimulateProjectAcceptance } from '../../hooks/useEngineeringData';
import type { ProjectAcceptanceSimulationResult } from '../../services/engineeringApi';

interface ProjectAcceptanceSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateProjectId?: string;
}

export const ProjectAcceptanceSimulatorModal: React.FC<ProjectAcceptanceSimulatorModalProps> = ({
  isOpen,
  onClose,
  candidateProjectId = 'PRJ-CANDIDATE-001',
}) => {
  const [projectIdInput, setProjectIdInput] = useState(candidateProjectId);
  const [complexityScore, setComplexityScore] = useState(1.35);
  const [targetDeliveryWeeks, setTargetDeliveryWeeks] = useState(8);
  const [estimatedWorkloadHours, setEstimatedWorkloadHours] = useState(80.0);
  const [simulationResult, setSimulationResult] = useState<ProjectAcceptanceSimulationResult | null>(null);

  const acceptanceMutation = useSimulateProjectAcceptance();

  if (!isOpen) return null;

  const handleSimulate = () => {
    acceptanceMutation.mutate(
      {
        candidateProjectId: projectIdInput.trim() || 'PRJ-CANDIDATE-001',
        complexityScore,
        targetDeliveryWeeks,
        estimatedWorkloadHours,
      },
      {
        onSuccess: (data) => {
          setSimulationResult(data);
        },
      }
    );
  };

  const isLoading = acceptanceMutation.isPending;
  const isError = acceptanceMutation.isError;
  const error = acceptanceMutation.error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-slate-100 text-base">New Project Acceptance Simulator</h3>
            <p className="text-xs text-slate-400">Non-mutating capacity feasibility & delivery prediction</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3.5 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Candidate Project ID</label>
            <input
              type="text"
              value={projectIdInput}
              onChange={(e) => setProjectIdInput(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Complexity Multiplier</label>
            <input
              type="number"
              step="0.05"
              min="0.5"
              max="3.0"
              value={complexityScore}
              onChange={(e) => setComplexityScore(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Target Delivery (Weeks)</label>
            <input
              type="number"
              min="1"
              max="52"
              value={targetDeliveryWeeks}
              onChange={(e) => setTargetDeliveryWeeks(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Estimated Hours</label>
            <input
              type="number"
              min="10"
              max="1000"
              value={estimatedWorkloadHours}
              onChange={(e) => setEstimatedWorkloadHours(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
            />
          </div>
        </div>

        <button
          onClick={handleSimulate}
          disabled={isLoading}
          className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-600/20"
        >
          {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
          {isLoading ? 'Simulating Feasibility...' : 'Run Feasibility Simulation'}
        </button>

        {isError && (
          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Simulation failed: {error?.message || 'Gateway connection error.'}</span>
          </div>
        )}

        {simulationResult && !isLoading && (
          <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300">Simulated Recommendation:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 ${
                  simulationResult.recommendation === 'ACCEPT'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : simulationResult.recommendation === 'REPLAN_SCHEDULE'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {simulationResult.recommendation === 'ACCEPT' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                )}
                {simulationResult.recommendation}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-400">Feasibility Score</div>
                <div className="font-bold text-cyan-300 mt-0.5">{simulationResult.feasibilityScore}%</div>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-400">Buffer Remaining</div>
                <div className="font-bold text-slate-200 mt-0.5">{simulationResult.bufferHoursRemaining} hrs</div>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-400">Bottlenecks</div>
                <div className="font-bold text-amber-300 mt-0.5">{simulationResult.potentialBottlenecks.length} items</div>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 bg-slate-900/40 p-2.5 rounded border border-slate-800/60 leading-relaxed">
              <span className="font-semibold text-slate-200">Rationale: </span>
              {simulationResult.rationale}
            </p>

            <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Human decision required. AI simulation does NOT autonomously accept projects or mutate records.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
