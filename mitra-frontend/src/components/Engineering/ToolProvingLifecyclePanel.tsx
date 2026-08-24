import React from 'react';
import { Wrench, Repeat, CheckCircle2, AlertCircle, Plus, RefreshCw, Check } from 'lucide-react';
import { useToolProvingCycles, useCreateToolProvingCycle } from '../../hooks/useEngineeringData';

export interface ToolModificationItem {
  id: string;
  modificationCode: string;
  category: string;
  rootCause: string;
  description: string;
  estimatedWorkloadUnits: number;
  actualWorkloadUnits: number;
  status: string;
}

interface ToolProvingLifecyclePanelProps {
  projectId?: string;
  cycleCode?: 'T0' | 'T1' | 'T2' | 'T3_FINAL';
  stage?: string;
  toolId?: string;
  modifications?: ToolModificationItem[];
  onAddModification?: () => void;
  onAdvanceTrial?: () => void;
}

export const ToolProvingLifecyclePanel: React.FC<ToolProvingLifecyclePanelProps> = ({
  projectId = 'PRJ-AUTO-HEADLAMP-001',
  cycleCode: propCycleCode,
  stage: propStage,
  toolId: propToolId,
  modifications: propModifications,
  onAddModification,
  onAdvanceTrial,
}) => {
  const {
    data: cycles,
    isLoading,
    isError,
    error,
    refetch,
  } = useToolProvingCycles(projectId, {
    enabled: !propModifications,
  });

  const createCycleMutation = useCreateToolProvingCycle();

  const activeCycle = cycles?.[0];
  const activeCycleCode: 'T0' | 'T1' | 'T2' | 'T3_FINAL' =
    propCycleCode ||
    (activeCycle?.cycleType === 'RELEASED'
      ? 'T3_FINAL'
      : (activeCycle?.cycleType as 'T0' | 'T1' | 'T2') || 'T0');

  const activeStage =
    propStage || (activeCycle?.isApprovedForProduction ? 'PRODUCTION_RELEASED' : 'MODIFICATION_WORKLOAD');
  const activeToolId = propToolId || activeCycle?.toolId || `TOOL-${projectId}`;

  const displayModifications: ToolModificationItem[] =
    propModifications ||
    (cycles && cycles.length > 0
      ? cycles.map((c, idx) => ({
          id: c.id,
          modificationCode: `MOD-${c.cycleType}-${(idx + 1).toString().padStart(3, '0')}`,
          category: c.cycleType === 'T0' ? 'COOLING_MODIFICATION' : 'T_DIA_CORRECTION',
          rootCause: 'PLANNED_TOOL_PROVING',
          description: `Trial cycle ${c.cycleType} - Tool ${c.toolId} (${c.modificationHours} hrs)`,
          estimatedWorkloadUnits: c.modificationHours,
          actualWorkloadUnits: c.modificationHours,
          status: c.isApprovedForProduction ? 'COMPLETED' : 'IN_PROGRESS',
        }))
      : []);

  const handleAdvanceTrial = () => {
    if (onAdvanceTrial) {
      onAdvanceTrial();
      return;
    }

    const nextCycleType: 'T0' | 'T1' | 'T2' =
      activeCycleCode === 'T0'
        ? 'T1'
        : 'T2';

    createCycleMutation.mutate({
      projectId,
      dto: {
        projectId,
        toolId: activeToolId,
        cycleType: nextCycleType,
        modificationHours: 4.0,
      },
    });
  };

  if (isLoading && !propModifications) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl animate-pulse space-y-3">
        <div className="h-6 w-1/3 bg-slate-800 rounded" />
        <div className="h-16 bg-slate-800/60 rounded-lg" />
        <div className="h-16 bg-slate-800/60 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm tracking-wide">
              Tool Proving & T0/T1/T2 Lifecycle
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Tool: <span className="text-amber-300 font-semibold">{activeToolId}</span> | Cycle:{' '}
              <span className="text-amber-300 font-bold">{activeCycleCode}</span> | Stage:{' '}
              <span className="text-slate-300 font-medium">{activeStage.replace(/_/g, ' ')}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onAddModification && (
            <button
              onClick={onAddModification}
              className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Modification
            </button>
          )}
          <button
            onClick={handleAdvanceTrial}
            disabled={createCycleMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 disabled:opacity-50 transition-all shadow-sm"
          >
            {createCycleMutation.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Repeat className="w-3.5 h-3.5" />
            )}
            {createCycleMutation.isPending ? 'Advancing...' : 'Advance Re-Trial (Human)'}
          </button>
        </div>
      </div>

      {isError && !propModifications && (
        <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Failed to load tool proving cycles: {error?.message || 'Network error.'}</span>
          </div>
          <button
            onClick={() => refetch()}
            className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-200 text-xs font-medium border border-rose-500/30"
          >
            Retry
          </button>
        </div>
      )}

      <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
        {displayModifications.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 flex flex-col items-center gap-2">
            <Check className="w-6 h-6 text-emerald-400" />
            <span>No tool modifications or trial iterations recorded for {activeToolId}.</span>
          </div>
        ) : (
          displayModifications.map((mod) => (
            <div
              key={mod.id}
              className="p-3 rounded-lg border border-slate-800 bg-slate-850/40 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {mod.modificationCode}
                  </span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                    {mod.category.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  {mod.actualWorkloadUnits}u Act
                </span>
              </div>

              <p className="text-xs text-slate-300 line-clamp-2 mb-2 leading-relaxed">
                {mod.description}
              </p>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1.5 border-t border-slate-800/60">
                <span>Cause: {mod.rootCause.replace(/_/g, ' ')}</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {mod.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
