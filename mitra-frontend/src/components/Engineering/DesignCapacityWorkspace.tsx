import React, { useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { DesignLifecycleWbsPanel, StageStateItem } from './DesignLifecycleWbsPanel';
import { DesignTeamCapacityPanel, EngineerCapacityItem } from './DesignTeamCapacityPanel';
import { ToolProvingLifecyclePanel, ToolModificationItem } from './ToolProvingLifecyclePanel';
import { PlannedVsActualLoadPanel } from './PlannedVsActualLoadPanel';
import { RevisionSafetyBanner } from './RevisionSafetyBanner';
import { useTeamCapacity, useHistoricalWorkload, useToolProvingCycles } from '../../hooks/useEngineeringData';

interface DesignCapacityWorkspaceProps {
  projectId?: string;
  packageId?: string;
}

const DEFAULT_STAGES: StageStateItem[] = [
  { stage: 'CUSTOMER_INPUTS', order: 1, status: 'COMPLETED', plannedUnits: 2.85, actualUnits: 2.85 },
  { stage: 'KICK_OFF_INPUT_SHEET', order: 2, status: 'COMPLETED', plannedUnits: 2.85, actualUnits: 3.0 },
  { stage: 'LAYOUT', order: 3, status: 'COMPLETED', plannedUnits: 2.85, actualUnits: 2.5 },
  { stage: 'CAVITY_MODEL', order: 4, status: 'COMPLETED', plannedUnits: 2.85, actualUnits: 3.2 },
  { stage: 'MOLD_DESIGN', order: 5, status: 'IN_PROGRESS', plannedUnits: 2.85, actualUnits: 1.5 },
  { stage: 'MASK_DESIGN', order: 6, status: 'NOT_STARTED', plannedUnits: 2.85, actualUnits: 0 },
  { stage: 'DESIGN_REVIEW', order: 7, status: 'NOT_STARTED', plannedUnits: 2.85, actualUnits: 0 },
  { stage: 'CUSTOMER_APPROVAL', order: 8, status: 'NOT_STARTED', plannedUnits: 2.85, actualUnits: 0, approvalStatus: 'PENDING' },
  { stage: 'RAW_MATERIAL', order: 9, status: 'NOT_STARTED', plannedUnits: 2.85, actualUnits: 0 },
  { stage: 'PROCESS_PLANNING', order: 10, status: 'NOT_STARTED', plannedUnits: 2.85, actualUnits: 0 },
  { stage: 'FINAL_PART_LIST', order: 11, status: 'NOT_STARTED', plannedUnits: 2.85, actualUnits: 0 },
  { stage: 'FINAL_DESIGN_REVIEW', order: 12, status: 'NOT_STARTED', plannedUnits: 2.85, actualUnits: 0 },
  { stage: 'DATA_TO_PROGRAMMING', order: 13, status: 'NOT_STARTED', plannedUnits: 2.85, actualUnits: 0 },
  { stage: 'DESIGN_DELIVERY_COMPLETE', order: 14, status: 'NOT_STARTED', plannedUnits: 2.85, actualUnits: 0 },
];

export const DesignCapacityWorkspace: React.FC<DesignCapacityWorkspaceProps> = ({
  projectId = 'PRJ-AUTO-HEADLAMP-001',
  packageId = 'DWP-AUTO-HEADLAMP-001',
}) => {
  const [selectedStage, setSelectedStage] = useState('MOLD_DESIGN');

  const {
    data: capacity,
    isError: isCapacityError,
    error: capacityError,
    refetch: refetchCapacity,
  } = useTeamCapacity();

  const { data: historicalWorkloads } = useHistoricalWorkload(projectId);
  const { data: toolProvingCycles } = useToolProvingCycles(projectId);

  const averageUtilization = capacity?.overallUtilizationPercentage ?? 0;
  const overloadedCount = capacity?.overloadedEngineersCount ?? 0;

  const engineerItems: EngineerCapacityItem[] = (capacity?.engineers ?? []).map((eng) => ({
    id: eng.engineerId,
    engineerCode: `ENG-${eng.engineerId.slice(0, 4).toUpperCase()}`,
    name: eng.engineerName,
    proficiencyLevel: eng.role,
    weeklyCapacityHours: eng.maxWeeklyHours,
    currentUtilizationPercentage: eng.utilizationPercentage,
    status: eng.isOverloaded ? 'OVERLOADED' : eng.utilizationPercentage > 0 ? 'LOADED' : 'AVAILABLE',
    primarySkills: [{ skill: eng.role, level: 'CERTIFIED' }],
  }));

  const toolModifications: ToolModificationItem[] = (toolProvingCycles ?? []).map((cycle, idx) => ({
    id: cycle.id,
    modificationCode: `MOD-${cycle.cycleType}-${(idx + 1).toString().padStart(3, '0')}`,
    category: cycle.cycleType === 'T0' ? 'COOLING_MODIFICATION' : 'T_DIA_CORRECTION',
    rootCause: 'PLANNED_TOOL_PROVING',
    description: `Tool trial modification cycle (${cycle.cycleType})`,
    estimatedWorkloadUnits: cycle.modificationHours,
    actualWorkloadUnits: cycle.modificationHours,
    status: cycle.isApprovedForProduction ? 'COMPLETED' : 'IN_PROGRESS',
  }));

  // Calculate planned vs actual totals from historical workloads
  const totalPlanned = (historicalWorkloads ?? []).reduce((acc, hw) => acc + hw.plannedHours, 0) || 40.0;
  const totalActual = (historicalWorkloads ?? []).reduce((acc, hw) => acc + hw.actualHours, 0) || 50.5;
  const totalVariance = Math.round((totalActual - totalPlanned) * 10) / 10;

  const activeCycleType = toolProvingCycles?.[0]?.cycleType;
  const cycleCode: 'T0' | 'T1' | 'T2' | 'T3_FINAL' =
    activeCycleType === 'RELEASED' ? 'T3_FINAL' : (activeCycleType as 'T0' | 'T1' | 'T2') || 'T0';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <RevisionSafetyBanner
        activeRevision="Rev A"
        analysisRevision="Rev A"
        isStale={false}
        drawingId={`DRW-${projectId}`}
      />

      {isCapacityError && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Failed to load team capacity data</p>
              <p className="text-xs text-rose-300 font-mono">{capacityError?.message || 'Network error.'}</p>
            </div>
          </div>
          <button
            onClick={() => refetchCapacity()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold border border-rose-500/40 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DesignLifecycleWbsPanel
          packageId={packageId}
          packageCode={packageId}
          currentStage={selectedStage}
          stages={DEFAULT_STAGES}
          onSelectStage={setSelectedStage}
        />

        <DesignTeamCapacityPanel
          engineers={engineerItems}
          averageUtilization={averageUtilization}
          overloadedCount={overloadedCount}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ToolProvingLifecyclePanel
          cycleCode={cycleCode}
          stage={toolProvingCycles?.[0]?.isApprovedForProduction ? 'RELEASED' : 'MODIFICATION_REQUIRED'}
          toolId={`MOLD-${projectId}`}
          modifications={toolModifications}
          onAdvanceTrial={() => alert('Advancing to T1 Re-Trial (Human Governed)')}
        />

        <PlannedVsActualLoadPanel
          projectId={projectId}
          plannedUnits={totalPlanned}
          actualUnits={totalActual}
          varianceUnits={totalVariance}
          modificationsByCategory={{
            COOLING_MODIFICATION: { count: 1, actualWorkload: 5.5 },
            T_DIA_CORRECTION: { count: 1, actualWorkload: 2.0 },
            E_DIA_CORRECTION: { count: 1, actualWorkload: 3.0 },
          }}
        />
      </div>
    </div>
  );
};
