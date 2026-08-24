import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';
import { DesignControlTowerHeader } from './DesignControlTowerHeader';
import { DesignProjectLoadControlPanel, ProjectLoadControlData } from './DesignProjectLoadControlPanel';
import { DesignLifecycleWbsPanel, StageStateItem } from './DesignLifecycleWbsPanel';
import { DesignTeamCapacityPanel, EngineerCapacityItem } from './DesignTeamCapacityPanel';
import { ToolProvingLifecyclePanel, ToolModificationItem } from './ToolProvingLifecyclePanel';
import { PlannedVsActualLoadPanel } from './PlannedVsActualLoadPanel';
import { ProjectAcceptanceSimulatorModal } from './ProjectAcceptanceSimulatorModal';
import { WhatIfPlanningModal } from './WhatIfPlanningModal';
import { RevisionSafetyBanner } from './RevisionSafetyBanner';
import { useProjectHealth, useTeamCapacity, useToolProvingCycles } from '../../hooks/useEngineeringData';

interface DesignControlTowerWorkspaceProps {
  projectId?: string;
  workPackageId?: string;
}

const DEFAULT_STAGES: StageStateItem[] = [
  { stage: 'CUSTOMER_INPUTS', order: 1, status: 'COMPLETED', plannedUnits: 3.85, actualUnits: 3.85 },
  { stage: 'KICK_OFF_INPUT_SHEET', order: 2, status: 'COMPLETED', plannedUnits: 3.85, actualUnits: 4.0 },
  { stage: 'LAYOUT', order: 3, status: 'COMPLETED', plannedUnits: 3.85, actualUnits: 3.5 },
  { stage: 'CAVITY_MODEL', order: 4, status: 'COMPLETED', plannedUnits: 3.85, actualUnits: 4.2 },
  { stage: 'MOLD_DESIGN', order: 5, status: 'IN_PROGRESS', plannedUnits: 3.85, actualUnits: 2.0 },
  { stage: 'MASK_DESIGN', order: 6, status: 'NOT_STARTED', plannedUnits: 3.85, actualUnits: 0 },
  { stage: 'DESIGN_REVIEW', order: 7, status: 'NOT_STARTED', plannedUnits: 3.85, actualUnits: 0 },
  { stage: 'CUSTOMER_APPROVAL', order: 8, status: 'NOT_STARTED', plannedUnits: 3.85, actualUnits: 0, approvalStatus: 'PENDING' },
  { stage: 'RAW_MATERIAL', order: 9, status: 'NOT_STARTED', plannedUnits: 3.85, actualUnits: 0 },
  { stage: 'PROCESS_PLANNING', order: 10, status: 'NOT_STARTED', plannedUnits: 3.85, actualUnits: 0 },
  { stage: 'FINAL_PART_LIST', order: 11, status: 'NOT_STARTED', plannedUnits: 3.85, actualUnits: 0 },
  { stage: 'FINAL_DESIGN_REVIEW', order: 12, status: 'NOT_STARTED', plannedUnits: 3.85, actualUnits: 0 },
  { stage: 'DATA_TO_PROGRAMMING', order: 13, status: 'NOT_STARTED', plannedUnits: 3.85, actualUnits: 0 },
  { stage: 'DESIGN_DELIVERY_COMPLETE', order: 14, status: 'NOT_STARTED', plannedUnits: 3.85, actualUnits: 0 },
];

export const DesignControlTowerWorkspace: React.FC<DesignControlTowerWorkspaceProps> = ({
  projectId = 'PRJ-AUTO-HEADLAMP-001',
  workPackageId = 'DWP-AUTO-HEADLAMP-001',
}) => {
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isWhatIfOpen, setIsWhatIfOpen] = useState(false);
  const [activeStage, setActiveStage] = useState('MOLD_DESIGN');

  // React Query live data hooks
  const {
    data: health,
    isLoading: isHealthLoading,
    isError: isHealthError,
    error: healthError,
    refetch: refetchHealth,
  } = useProjectHealth(projectId);

  const {
    data: capacity,
    isLoading: isCapacityLoading,
    isError: isCapacityError,
    refetch: refetchCapacity,
  } = useTeamCapacity();

  const { data: toolProvingCycles } = useToolProvingCycles(projectId);

  // Derive transformed UI models from live backend responses
  const totalEngineers = capacity?.engineers.length ?? 0;
  const totalCapacityHours = capacity?.totalCapacityHours ?? 0;
  const averageUtilization = capacity?.overallUtilizationPercentage ?? 0;
  const overloadedEngineersCount = capacity?.overloadedEngineersCount ?? 0;

  const activeProjectsCount = health ? 1 : 0;
  const projectsAtRiskCount = health?.overallStatus === 'AT_RISK' || health?.overallStatus === 'CRITICAL' ? 1 : 0;
  const blockedStagesCount = health?.blockedDeliverablesCount ?? 0;
  const pendingApprovalsCount = health?.missingEvidenceCount ?? 0;

  // Map engineer items
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

  // Map project load control data
  const projectControlData: ProjectLoadControlData = {
    projectId,
    moldComplexityMultiplier: 1.35,
    completionPercentage:
      health && health.activeDeliverablesCount + health.completedDeliverablesCount > 0
        ? Math.round((health.completedDeliverablesCount / (health.activeDeliverablesCount + health.completedDeliverablesCount)) * 100)
        : 35.7,
    scheduleHealth:
      health?.overallStatus === 'CRITICAL' || health?.overallStatus === 'BLOCKED'
        ? 'CRITICAL'
        : health?.overallStatus === 'AT_RISK'
        ? 'AT_RISK'
        : 'ON_TRACK',
    replanRequired: (health?.burnRateVariancePercentage ?? 0) > 15 || health?.overallStatus === 'CRITICAL',
    replanReason:
      health?.overallStatus === 'CRITICAL'
        ? 'Critical deliverable blockers and evidence discrepancies require governed replan.'
        : undefined,
    workload: {
      plannedUnits: health?.totalPlannedHours ?? 54.0,
      actualUnits: health?.totalActualHours ?? 58.5,
      remainingUnits: Math.max(0, (health?.totalPlannedHours ?? 54.0) - (health?.totalActualHours ?? 58.5)),
      varianceUnits: Math.round(((health?.totalActualHours ?? 58.5) - (health?.totalPlannedHours ?? 54.0)) * 10) / 10,
    },
    activeBlockersCount: health?.topBlockers.length ?? 0,
  };

  // Map tool modifications
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

  // Handle 404 Project Not Found
  if (healthError?.isProjectNotFound) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <AlertTriangle className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Project Not Found</h2>
        <p className="text-sm text-slate-400 font-mono">
          Project <span className="text-amber-300 font-bold">{projectId}</span> does not exist in the MITRA engineering database.
        </p>
        <button
          onClick={() => refetchHealth()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Query
        </button>
      </div>
    );
  }

  // Handle 403 Forbidden
  if (healthError?.isForbidden) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Access Restricted (Tenant Isolation)</h2>
        <p className="text-sm text-slate-400">You do not have permission to access project control tower data for this tenant.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <RevisionSafetyBanner
        activeRevision="Rev A"
        analysisRevision="Rev A"
        isStale={false}
        drawingId={`DRW-${projectId}`}
      />

      {/* Global Loading Shimmer / Header */}
      {isHealthLoading || isCapacityLoading ? (
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse space-y-4">
          <div className="h-6 w-1/3 bg-slate-800 rounded" />
          <div className="grid grid-cols-4 gap-4">
            <div className="h-16 bg-slate-800/80 rounded" />
            <div className="h-16 bg-slate-800/80 rounded" />
            <div className="h-16 bg-slate-800/80 rounded" />
            <div className="h-16 bg-slate-800/80 rounded" />
          </div>
        </div>
      ) : isHealthError || isCapacityError ? (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Failed to load real-time control tower metrics</p>
              <p className="text-xs text-rose-300 font-mono">{healthError?.message || 'Gateway connection error.'}</p>
            </div>
          </div>
          <button
            onClick={() => {
              refetchHealth();
              refetchCapacity();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold border border-rose-500/40 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : (
        <DesignControlTowerHeader
          totalEngineers={totalEngineers}
          totalCapacityHours={totalCapacityHours}
          averageUtilization={averageUtilization}
          overloadedEngineersCount={overloadedEngineersCount}
          activeProjectsCount={activeProjectsCount}
          projectsAtRiskCount={projectsAtRiskCount}
          blockedStagesCount={blockedStagesCount}
          pendingApprovalsCount={pendingApprovalsCount}
          onOpenAcceptanceSimulator={() => setIsSimulatorOpen(true)}
          onOpenWhatIf={() => setIsWhatIfOpen(true)}
        />
      )}

      {/* Grid: Project Load Control & Lifecycle WBS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DesignProjectLoadControlPanel
          projectId={projectId}
          projectData={projectControlData}
          onRequestReplan={() => alert(`Governed Replan Request created for ${projectId}.`)}
        />

        <DesignLifecycleWbsPanel
          packageId={workPackageId}
          packageCode={workPackageId}
          currentStage={activeStage}
          stages={DEFAULT_STAGES}
          onSelectStage={setActiveStage}
        />
      </div>

      {/* Grid: Team Capacity & Planned vs Actual Load */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DesignTeamCapacityPanel
          engineers={engineerItems}
          averageUtilization={averageUtilization}
          overloadedCount={overloadedEngineersCount}
        />

        <PlannedVsActualLoadPanel
          projectId={projectId}
          plannedUnits={projectControlData.workload.plannedUnits}
          actualUnits={projectControlData.workload.actualUnits}
          varianceUnits={projectControlData.workload.varianceUnits}
          modificationsByCategory={{
            COOLING_MODIFICATION: { count: 1, actualWorkload: 5.5 },
          }}
        />
      </div>

      {/* Tool Proving Panel */}
      <ToolProvingLifecyclePanel
        cycleCode={
          toolProvingCycles?.[0]?.cycleType === 'RELEASED'
            ? 'T3_FINAL'
            : (toolProvingCycles?.[0]?.cycleType as 'T0' | 'T1' | 'T2') || 'T0'
        }
        stage={toolProvingCycles?.[0]?.isApprovedForProduction ? 'RELEASED' : 'FIRST_TRIAL'}
        toolId={`TOOL-${projectId}`}
        modifications={toolModifications}
      />

      {/* Modals */}
      <ProjectAcceptanceSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />

      <WhatIfPlanningModal
        isOpen={isWhatIfOpen}
        onClose={() => setIsWhatIfOpen(false)}
      />
    </div>
  );
};
