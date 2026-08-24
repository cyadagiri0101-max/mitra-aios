import React, { useState } from 'react';
import { X, Play, HelpCircle, AlertCircle, RefreshCw, Users } from 'lucide-react';
import { useSimulateWhatIf } from '../../hooks/useEngineeringData';
import type { WhatIfSimulationResult } from '../../services/engineeringApi';

interface WhatIfPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

export const WhatIfPlanningModal: React.FC<WhatIfPlanningModalProps> = ({
  isOpen,
  onClose,
  projectId = 'PRJ-AUTO-HEADLAMP-001',
}) => {
  const [activeProjectId, setActiveProjectId] = useState(projectId);
  const [unavailableEngineerId, setUnavailableEngineerId] = useState('ENG-001');
  const [reassignToEngineerId, setReassignToEngineerId] = useState('ENG-002');
  const [simulationResult, setSimulationResult] = useState<WhatIfSimulationResult | null>(null);

  const whatIfMutation = useSimulateWhatIf();

  if (!isOpen) return null;

  const handleSimulate = () => {
    whatIfMutation.mutate(
      {
        projectId: activeProjectId.trim() || 'PRJ-AUTO-HEADLAMP-001',
        unavailableEngineerIds: [unavailableEngineerId],
        reassignedEngineerIds: [reassignToEngineerId],
      },
      {
        onSuccess: (data) => {
          setSimulationResult(data);
        },
      }
    );
  };

  const isLoading = whatIfMutation.isPending;
  const isError = whatIfMutation.isError;
  const error = whatIfMutation.error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-slate-100 text-base">What-If Planning Simulator</h3>
            <p className="text-xs text-slate-400">Non-mutating scenario evaluation & resource sensitivity</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Target Project</label>
            <input
              type="text"
              value={activeProjectId}
              onChange={(e) => setActiveProjectId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Unavailable Engineer</label>
              <select
                value={unavailableEngineerId}
                onChange={(e) => setUnavailableEngineerId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200"
              >
                <option value="ENG-001">Alice (Senior Mold Designer)</option>
                <option value="ENG-002">Bob (Cavity Specialist)</option>
                <option value="ENG-003">Carol (Tooling Analyst)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Backup Reassignment Target</label>
              <select
                value={reassignToEngineerId}
                onChange={(e) => setReassignToEngineerId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200"
              >
                <option value="ENG-002">Bob (Cavity Specialist)</option>
                <option value="ENG-003">Carol (Tooling Analyst)</option>
                <option value="ENG-001">Alice (Senior Mold Designer)</option>
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={handleSimulate}
          disabled={isLoading}
          className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20"
        >
          {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
          {isLoading ? 'Evaluating Scenario...' : 'Evaluate Scenario'}
        </button>

        {isError && (
          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Scenario evaluation failed: {error?.message || 'Gateway connection error.'}</span>
          </div>
        )}

        {simulationResult && !isLoading && (
          <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-400">Impacted Tasks</div>
                <div className="font-bold text-amber-300 mt-0.5">{simulationResult.impactedDeliverablesCount} items</div>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-400">Estimated Delay</div>
                <div
                  className={`font-bold mt-0.5 ${
                    simulationResult.estimatedDelayDays > 3 ? 'text-rose-400' : 'text-cyan-300'
                  }`}
                >
                  +{simulationResult.estimatedDelayDays} days
                </div>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-400">Capacity Deficit</div>
                <div className="font-bold text-slate-200 mt-0.5">{simulationResult.capacityDeficitHours} hrs</div>
              </div>
            </div>

            {simulationResult.reassignmentRecommendations.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-400" /> Suggested Task Reassignments:
                </div>
                {simulationResult.reassignmentRecommendations.map((r, i) => (
                  <div
                    key={i}
                    className="p-2 rounded bg-slate-900/40 border border-slate-800/60 text-[11px] text-slate-300 flex items-center justify-between font-mono"
                  >
                    <span>Task {r.deliverableId}</span>
                    <span className="text-indigo-300">{r.fromEngineerId} &rarr; {r.toEngineerId}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Scenario visibility only. Does NOT autonomously reassign team members or modify schedules.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
