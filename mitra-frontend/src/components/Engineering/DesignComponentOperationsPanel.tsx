import React from 'react';
import { Box, CheckCircle2, Clock, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { useProjectDeliverables, useUpdateDeliverableStatus } from '../../hooks/useEngineeringData';
import type { DeliverableStatus } from '../../services/engineeringApi';

export interface ComponentDeliverableItem {
  id: string;
  deliverableType: string;
  name: string;
  plannedUnits: number;
  actualUnits: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'VERIFIED';
  completionTimestamp?: string;
  evidenceReference?: string;
}

export interface DesignComponentItem {
  id: string;
  componentCode: string;
  name: string;
  componentType: string;
  variantBpCode?: string;
  activeRevision: string;
  responsibleEngineerId?: string;
  status: string;
  plannedWorkloadUnits: number;
  actualWorkloadUnits: number;
  reworkWorkloadUnits: number;
  completionPercentage: number;
  revisionsCount: number;
  deliverables: ComponentDeliverableItem[];
}

interface DesignComponentOperationsPanelProps {
  projectId: string;
  components?: DesignComponentItem[];
  onAddRevision?: (componentId: string) => void;
  onUpdateDeliverable?: (deliverableId: string) => void;
}

export const DesignComponentOperationsPanel: React.FC<DesignComponentOperationsPanelProps> = ({
  projectId,
  components: propComponents,
  onAddRevision,
  onUpdateDeliverable,
}) => {
  const {
    data: deliverables,
    isLoading,
    isError,
    error,
    refetch,
  } = useProjectDeliverables(projectId);

  const updateStatusMutation = useUpdateDeliverableStatus();

  // Transform backend deliverables into grouped component list if props not explicitly provided
  const displayComponents: DesignComponentItem[] = propComponents || (() => {
    if (!deliverables || deliverables.length === 0) return [];

    const grouped: Record<string, DesignComponentItem> = {};

    deliverables.forEach((deliv) => {
      const compId = deliv.componentId || 'comp-default';
      if (!grouped[compId]) {
        grouped[compId] = {
          id: compId,
          componentCode: `COMP-${compId.slice(0, 4).toUpperCase()}`,
          name: deliv.deliverableName || 'Core Cavity Block',
          componentType: 'CORE_CAVITY',
          activeRevision: 'Rev A',
          status: deliv.status,
          plannedWorkloadUnits: 4.0,
          actualWorkloadUnits: deliv.status === 'VERIFIED' || deliv.status === 'APPROVED' ? 4.0 : 2.0,
          reworkWorkloadUnits: deliv.status === 'BLOCKED' ? 1.5 : 0,
          completionPercentage: deliv.status === 'VERIFIED' || deliv.status === 'APPROVED' ? 100 : 50,
          revisionsCount: 1,
          deliverables: [],
        };
      }

      grouped[compId].deliverables.push({
        id: deliv.id,
        deliverableType: deliv.deliverableName,
        name: deliv.deliverableName,
        plannedUnits: 1.0,
        actualUnits: deliv.status === 'VERIFIED' ? 1.0 : 0.5,
        status: deliv.status === 'VERIFIED' || deliv.status === 'APPROVED' ? 'COMPLETED' : (deliv.status as any),
        evidenceReference: deliv.evidenceFileHash,
      });
    });

    return Object.values(grouped);
  })();

  const handleDeliverableClick = (delivId: string, currentStatus: DeliverableStatus) => {
    if (onUpdateDeliverable) {
      onUpdateDeliverable(delivId);
      return;
    }

    // Interactive human status advance
    const nextStatus: DeliverableStatus =
      currentStatus === 'PENDING'
        ? 'IN_PROGRESS'
        : currentStatus === 'IN_PROGRESS'
        ? 'VERIFIED'
        : currentStatus === 'VERIFIED'
        ? 'APPROVED'
        : 'IN_PROGRESS';

    updateStatusMutation.mutate({
      deliverableId: delivId,
      projectId,
      dto: { status: nextStatus },
    });
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl animate-pulse space-y-3">
        <div className="h-6 w-1/3 bg-slate-800 rounded" />
        <div className="h-24 bg-slate-800/60 rounded-lg" />
        <div className="h-24 bg-slate-800/60 rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl space-y-4">
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Failed to load component deliverables</p>
              <p className="text-xs text-rose-300 font-mono">{error?.message || 'Network error.'}</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold border border-rose-500/40 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm tracking-wide">
              Component-Level Design Operations & Revisions
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Project: <span className="text-emerald-300 font-bold">{projectId}</span> | Total Components:{' '}
              <span className="text-slate-200 font-bold">{displayComponents.length}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {displayComponents.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No design components or deliverables found for project {projectId}.
          </div>
        ) : (
          displayComponents.map((comp) => (
            <div
              key={comp.id}
              className="p-3.5 rounded-lg bg-slate-850/60 border border-slate-800 space-y-2.5 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {comp.componentCode}
                  </span>
                  <span className="text-xs font-semibold text-slate-200">{comp.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                    {comp.componentType.replace(/_/g, ' ')}
                  </span>
                  {comp.variantBpCode && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      Var: {comp.variantBpCode}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                    {comp.activeRevision}
                  </span>
                  <button
                    onClick={() => onAddRevision?.(comp.id)}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    Revision
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Planned: {comp.plannedWorkloadUnits}u</span>
                <span>Actual: {comp.actualWorkloadUnits}u</span>
                {comp.reworkWorkloadUnits > 0 && (
                  <span className="text-amber-400">Rework: +{comp.reworkWorkloadUnits}u</span>
                )}
                <span className="text-cyan-300 font-bold">{comp.completionPercentage}% Done</span>
              </div>

              {/* Granular deliverables list */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 border-t border-slate-800/80">
                {comp.deliverables.map((deliv) => {
                  const isComplete = deliv.status === 'COMPLETED' || (deliv.status as string) === 'VERIFIED';
                  return (
                    <div
                      key={deliv.id}
                      onClick={() => handleDeliverableClick(deliv.id, deliv.status as DeliverableStatus)}
                      className={`p-2 rounded border text-left cursor-pointer transition-all ${
                        isComplete
                          ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-medium mb-1">
                        <span className="text-slate-300 line-clamp-1">{deliv.deliverableType.replace(/_/g, ' ')}</span>
                        {isComplete ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : (
                          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                        <span>{deliv.actualUnits}/{deliv.plannedUnits}u</span>
                        <span className="text-slate-400">{deliv.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
