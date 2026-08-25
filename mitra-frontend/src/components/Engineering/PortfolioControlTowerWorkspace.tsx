import React, { useState } from 'react';
import {
  RefreshCw,
  Sliders,
  Camera,
  Activity,
  AlertCircle,
} from 'lucide-react';

import {
  usePortfolioSnapshot,
  usePortfolioDemand,
  usePortfolioCapacity,
  usePortfolioBottlenecks,
  useBalancingRecommendations,
  useCrossProjectAllocations,
  useCreatePortfolioSnapshot,
  useCreateAllocation,
  useUpdateAllocationStatus,
  useSimulatePortfolioScenario,
} from '../../hooks/usePortfolioData';
import { usePortfolioRealtimeSync } from '../../hooks/usePortfolioRealtimeSync';

import { PortfolioDemandPanel } from './PortfolioDemandPanel';
import { GlobalCapacityPanel } from './GlobalCapacityPanel';
import { BottleneckAnalysisPanel } from './BottleneckAnalysisPanel';
import { RebalancingAdvisoryPanel } from './RebalancingAdvisoryPanel';
import { CrossProjectAllocationPanel } from './CrossProjectAllocationPanel';
import { PortfolioScenarioSimulatorModal } from './PortfolioScenarioSimulatorModal';
import { PortfolioSnapshotModal } from './PortfolioSnapshotModal';
import type { BalancingRecommendationDto } from '../../services/engineeringApi';

export const PortfolioControlTowerWorkspace: React.FC = () => {
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);

  // Live SSE stream sync
  const { isConnected: isRealtimeConnected } = usePortfolioRealtimeSync();

  // Live queries
  const {
    data: snapshot,
    isLoading: isSnapshotLoading,
    refetch: refetchSnapshot,
  } = usePortfolioSnapshot();

  const {
    data: demand,
    isLoading: isDemandLoading,
    isError: isDemandError,
    error: demandError,
    refetch: refetchDemand,
  } = usePortfolioDemand();

  const {
    data: capacity,
    isLoading: isCapacityLoading,
    isError: isCapacityError,
    error: capacityError,
    refetch: refetchCapacity,
  } = usePortfolioCapacity();

  const {
    data: bottlenecksData,
    isLoading: isBottlenecksLoading,
    refetch: refetchBottlenecks,
  } = usePortfolioBottlenecks();

  const {
    data: recommendationsData,
    isLoading: isRecommendationsLoading,
    refetch: refetchRecommendations,
  } = useBalancingRecommendations();

  const {
    data: allocations,
    isLoading: isAllocationsLoading,
    refetch: refetchAllocations,
  } = useCrossProjectAllocations();

  // Mutations
  const createSnapshotMutation = useCreatePortfolioSnapshot();
  const createAllocationMutation = useCreateAllocation();
  const updateStatusMutation = useUpdateAllocationStatus();
  const simulateScenarioMutation = useSimulatePortfolioScenario();

  const handleRefreshAll = () => {
    refetchSnapshot();
    refetchDemand();
    refetchCapacity();
    refetchBottlenecks();
    refetchRecommendations();
    refetchAllocations();
  };

  const handleApplyRecommendation = async (rec: BalancingRecommendationDto) => {
    if (!rec.targetProjectId || !rec.engineerId) return;
    await createAllocationMutation.mutateAsync({
      projectId: rec.targetProjectId,
      engineerId: rec.engineerId,
      engineerName: rec.engineerName || `Engineer ${rec.engineerId}`,
      allocationRole: 'LEAD_DESIGNER',
      allocatedHoursPerWeek: rec.suggestedHours,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      reviewRationale: `Applied recommendation: ${rec.rationale}`,
    });
  };

  // Top KPIs
  const activeProjectsCount = demand?.activeProjectsCount || 0;
  const totalDemandHours = demand?.totalDemandHours || 0;
  const totalAvailableCapacity = capacity?.totalAvailableWeeklyCapacityHours || 0;
  const overallUtilization = capacity?.overallUtilizationPercentage || 0;
  const overloadedEngineers = capacity?.overloadedEngineersCount || 0;
  const bottleneckCount = bottlenecksData?.bottlenecks?.length || 0;
  const healthScore = bottlenecksData?.overallHealthScore || 100;
  const activeAllocationsCount = allocations?.filter((a) => a.allocationStatus === 'ACTIVE').length || 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-2xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5 flex-wrap">
                Enterprise Portfolio Control Tower
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  M12.5 Orchestration
                </span>
                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border ${isRealtimeConnected ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isRealtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  {isRealtimeConnected ? 'Live Sync Active' : 'Connecting Stream...'}
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Global Capacity Balancing, Cross-Program Demand &amp; What-If Simulation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsSnapshotOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Camera className="w-4 h-4 text-indigo-400" />
            Snapshot Baseline
          </button>

          <button
            onClick={() => setIsSimulatorOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-cyan-600/20"
          >
            <Sliders className="w-4 h-4" />
            What-If Simulator
          </button>

          <button
            onClick={handleRefreshAll}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Refresh Portfolio Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Banners */}
      {(isDemandError || isCapacityError) && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>
            {demandError?.message || capacityError?.message || 'Failed to load portfolio metrics from backend API.'}
          </span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl text-center backdrop-blur-md">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Programs</span>
          <span className="text-xl font-bold text-slate-100 font-mono mt-1 block">
            {activeProjectsCount}
          </span>
          <span className="text-[10px] text-slate-500">Active Automotive</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl text-center backdrop-blur-md">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Demand Hours</span>
          <span className="text-xl font-bold text-blue-400 font-mono mt-1 block">
            {Math.round(totalDemandHours)}h
          </span>
          <span className="text-[10px] text-slate-500">Total Workload</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl text-center backdrop-blur-md">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Weekly Capacity</span>
          <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">
            {Math.round(totalAvailableCapacity)}h
          </span>
          <span className="text-[10px] text-slate-500">Available Pool</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl text-center backdrop-blur-md">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Utilization</span>
          <span
            className={`text-xl font-bold font-mono mt-1 block ${
              overallUtilization > 100
                ? 'text-rose-400'
                : overallUtilization < 80
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {overallUtilization.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-500">Resource Load</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl text-center backdrop-blur-md">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Overloaded</span>
          <span
            className={`text-xl font-bold font-mono mt-1 block ${
              overloadedEngineers > 0 ? 'text-rose-400' : 'text-slate-200'
            }`}
          >
            {overloadedEngineers}
          </span>
          <span className="text-[10px] text-slate-500">&gt;100% Capacity</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl text-center backdrop-blur-md">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Bottlenecks</span>
          <span
            className={`text-xl font-bold font-mono mt-1 block ${
              bottleneckCount > 0 ? 'text-amber-400' : 'text-slate-200'
            }`}
          >
            {bottleneckCount}
          </span>
          <span className="text-[10px] text-slate-500">Constraints</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl text-center backdrop-blur-md">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Health Score</span>
          <span
            className={`text-xl font-bold font-mono mt-1 block ${
              healthScore >= 90
                ? 'text-emerald-400'
                : healthScore >= 70
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {healthScore}/100
          </span>
          <span className="text-[10px] text-slate-500">Global Score</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl text-center backdrop-blur-md">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Allocations</span>
          <span className="text-xl font-bold text-indigo-400 font-mono mt-1 block">
            {activeAllocationsCount}
          </span>
          <span className="text-[10px] text-slate-500">Active Multi-Project</span>
        </div>
      </div>

      {/* Main 2-Column Grid: Demand & Capacity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PortfolioDemandPanel demand={demand} isLoading={isDemandLoading} />
        <GlobalCapacityPanel capacity={capacity} isLoading={isCapacityLoading} />
      </div>

      {/* Secondary 2-Column Grid: Bottlenecks & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BottleneckAnalysisPanel
          bottlenecks={bottlenecksData?.bottlenecks}
          overallHealthScore={bottlenecksData?.overallHealthScore}
          isLoading={isBottlenecksLoading}
        />
        <RebalancingAdvisoryPanel
          recommendations={recommendationsData?.recommendations}
          isLoading={isRecommendationsLoading}
          onApplyRecommendation={handleApplyRecommendation}
        />
      </div>

      {/* Cross-Project Allocations Data Grid */}
      <CrossProjectAllocationPanel
        allocations={allocations}
        isLoading={isAllocationsLoading}
        onCreateAllocation={async (dto) => {
          await createAllocationMutation.mutateAsync(dto);
        }}
        onUpdateStatus={async (allocationId, dto) => {
          await updateStatusMutation.mutateAsync({ allocationId, dto });
        }}
      />

      {/* What-If Simulator Modal */}
      <PortfolioScenarioSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onSimulate={async (dto) => {
          return await simulateScenarioMutation.mutateAsync(dto);
        }}
      />

      {/* Portfolio Snapshot Modal */}
      <PortfolioSnapshotModal
        isOpen={isSnapshotOpen}
        onClose={() => setIsSnapshotOpen(false)}
        snapshot={snapshot || null}
        isLoading={isSnapshotLoading}
        onCreateSnapshot={async (dto) => {
          return await createSnapshotMutation.mutateAsync(dto);
        }}
      />
    </div>
  );
};
