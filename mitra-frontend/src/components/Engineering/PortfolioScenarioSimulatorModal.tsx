import React, { useState } from 'react';
import { Sliders, Play, RotateCcw, ArrowRight, ShieldCheck } from 'lucide-react';
import type {
  SimulatePortfolioScenarioDto,
  ScenarioSimulationResultDto,
} from '../../services/engineeringApi';

interface PortfolioScenarioSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulate: (dto: SimulatePortfolioScenarioDto) => Promise<ScenarioSimulationResultDto>;
}

export const PortfolioScenarioSimulatorModal: React.FC<PortfolioScenarioSimulatorModalProps> = ({
  isOpen,
  onClose,
  onSimulate,
}) => {
  const [scenarioName, setScenarioName] = useState('Capacity Stress Test');
  const [capacityMultiplier, setCapacityMultiplier] = useState<number>(1.0);
  const [delayedProjectId, setDelayedProjectId] = useState('');
  const [delayDays, setDelayDays] = useState(14);
  const [prospectiveProjectId, setProspectiveProjectId] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<ScenarioSimulationResultDto | null>(null);

  if (!isOpen) return null;

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSimulating(true);
      const payload: SimulatePortfolioScenarioDto = {
        scenarioName,
        capacityMultiplier: Number(capacityMultiplier),
        addedProjectIds: prospectiveProjectId ? [prospectiveProjectId] : [],
        delayedProjects: delayedProjectId ? [{ projectId: delayedProjectId, delayDays: Number(delayDays) }] : [],
      };
      const res = await onSimulate(payload);
      setResult(res);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setCapacityMultiplier(1.0);
    setDelayedProjectId('');
    setProspectiveProjectId('');
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Portfolio What-If Scenario Simulator
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  NON-MUTATING / IN-MEMORY
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Simulate timeline slips, new project injection, and capacity scaling without altering live production schedules.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {/* Controls Form */}
          <form onSubmit={handleSimulate} className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Scenario Label</label>
                <input
                  type="text"
                  required
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Global Capacity Multiplier: <strong className="text-cyan-400">{capacityMultiplier.toFixed(2)}x</strong>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={capacityMultiplier}
                  onChange={(e) => setCapacityMultiplier(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 mt-2"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Inject Prospective Program</label>
                <input
                  type="text"
                  placeholder="e.g. PRJ_BM400_EV"
                  value={prospectiveProjectId}
                  onChange={(e) => setProspectiveProjectId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Simulate Schedule Slip on Project</label>
                <input
                  type="text"
                  placeholder="e.g. BM289"
                  value={delayedProjectId}
                  onChange={(e) => setDelayedProjectId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Delay Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={delayDays}
                  onChange={(e) => setDelayDays(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Parameters
              </button>

              <button
                type="submit"
                disabled={isSimulating}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                {isSimulating ? 'Computing What-If...' : 'Run Simulation'}
              </button>
            </div>
          </form>

          {/* Results Display */}
          {result && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 text-center">
                  <span className="text-[11px] uppercase text-slate-400 font-mono">Demand Hours</span>
                  <div className="text-base font-bold text-slate-200 mt-1">
                    {Math.round(result.baselineSummary.totalDemandHours)}h{' '}
                    <ArrowRight className="inline w-3 h-3 text-slate-500 mx-1" />
                    <span className="text-cyan-300">{Math.round(result.simulatedSummary.totalDemandHours)}h</span>
                  </div>
                  <span className="text-[11px] text-cyan-400 font-mono">
                    {result.deltas.demandHoursDelta >= 0 ? `+${Math.round(result.deltas.demandHoursDelta)}h` : `${Math.round(result.deltas.demandHoursDelta)}h`}
                  </span>
                </div>

                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 text-center">
                  <span className="text-[11px] uppercase text-slate-400 font-mono">Capacity Hours</span>
                  <div className="text-base font-bold text-slate-200 mt-1">
                    {Math.round(result.baselineSummary.totalCapacityHours)}h{' '}
                    <ArrowRight className="inline w-3 h-3 text-slate-500 mx-1" />
                    <span className="text-emerald-300">{Math.round(result.simulatedSummary.totalCapacityHours)}h</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    {result.deltas.capacityHoursDelta >= 0 ? `+${Math.round(result.deltas.capacityHoursDelta)}h` : `${Math.round(result.deltas.capacityHoursDelta)}h`}
                  </span>
                </div>

                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 text-center">
                  <span className="text-[11px] uppercase text-slate-400 font-mono">Utilization</span>
                  <div className="text-base font-bold text-slate-200 mt-1">
                    {result.baselineSummary.utilizationPercentage.toFixed(1)}%{' '}
                    <ArrowRight className="inline w-3 h-3 text-slate-500 mx-1" />
                    <span className="text-amber-300">{result.simulatedSummary.utilizationPercentage.toFixed(1)}%</span>
                  </div>
                  <span className="text-[11px] text-amber-400 font-mono">
                    {result.deltas.utilizationDelta >= 0 ? `+${result.deltas.utilizationDelta.toFixed(1)}%` : `${result.deltas.utilizationDelta.toFixed(1)}%`}
                  </span>
                </div>

                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 text-center">
                  <span className="text-[11px] uppercase text-slate-400 font-mono">Overloaded Engineers</span>
                  <div className="text-base font-bold text-slate-200 mt-1">
                    {result.baselineSummary.overloadedEngineersCount}{' '}
                    <ArrowRight className="inline w-3 h-3 text-slate-500 mx-1" />
                    <span className="text-rose-300">{result.simulatedSummary.overloadedEngineersCount}</span>
                  </div>
                  <span className="text-[11px] text-rose-400 font-mono">
                    Δ {result.deltas.overloadedEngineersDelta}
                  </span>
                </div>
              </div>

              {/* Affected Impact List */}
              {result.affectedProjects.length > 0 && (
                <div className="bg-slate-800/30 p-3.5 rounded-xl border border-slate-700/40">
                  <h5 className="text-xs font-semibold text-slate-300 uppercase font-mono mb-2">Program Impact Analysis</h5>
                  <div className="space-y-1.5">
                    {result.affectedProjects.map((p) => (
                      <div key={p.projectId} className="flex items-center justify-between text-xs text-slate-300">
                        <span className="font-mono text-cyan-300 font-semibold">{p.projectId}</span>
                        <span className="text-slate-400">{p.impactDescription}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Advisory What-If Simulation — In-memory computation only
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
};
