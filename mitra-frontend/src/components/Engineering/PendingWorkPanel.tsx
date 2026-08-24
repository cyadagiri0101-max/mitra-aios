import React from 'react';
import { AlertCircle, Clock, CheckCircle2, User, FileText, RefreshCw, Check } from 'lucide-react';
import { useProjectPendingWork } from '../../hooks/useEngineeringData';

export interface PendingWorkItem {
  id: string;
  itemType: string;
  componentCode: string;
  componentName: string;
  deliverableType: string;
  deliverableName: string;
  responsibleEngineer: string;
  status: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  plannedUnits: number;
  actualUnits: number;
  whyPendingReason: string;
  evidenceFound: boolean;
  evidenceReference?: string | null;
}

interface PendingWorkPanelProps {
  projectId: string;
  totalPendingCount?: number;
  criticalCount?: number;
  highCount?: number;
  pendingItems?: PendingWorkItem[];
}

export const PendingWorkPanel: React.FC<PendingWorkPanelProps> = ({
  projectId,
  totalPendingCount: propTotal,
  criticalCount: propCritical,
  highCount: propHigh,
  pendingItems: propItems,
}) => {
  const { data: pendingData, isLoading, isError, error, refetch } = useProjectPendingWork(projectId, {
    enabled: Boolean(projectId && !propItems),
  });

  const displayItems: PendingWorkItem[] = propItems || (() => {
    if (!pendingData) return [];

    const items: PendingWorkItem[] = [];

    // Map active blockers
    (pendingData.activeBlockers ?? []).forEach((b) => {
      items.push({
        id: b.id,
        itemType: 'BLOCKER',
        componentCode: `COMP-${b.componentId.slice(0, 4).toUpperCase()}`,
        componentName: 'Core Cavity Component',
        deliverableType: 'BLOCKER',
        deliverableName: b.title,
        responsibleEngineer: 'Unassigned',
        status: 'BLOCKED',
        priority: b.severity as any,
        plannedUnits: 2.0,
        actualUnits: 2.0,
        whyPendingReason: b.reason,
        evidenceFound: false,
      });
    });

    // Map pending deliverables
    (pendingData.pendingDeliverables ?? []).forEach((d) => {
      items.push({
        id: d.id,
        itemType: 'DELIVERABLE',
        componentCode: `COMP-${d.componentId.slice(0, 4).toUpperCase()}`,
        componentName: d.deliverableName,
        deliverableType: d.deliverableName,
        deliverableName: d.deliverableName,
        responsibleEngineer: d.assignedEngineerName || 'Design Engineer',
        status: d.status,
        priority: d.activeBlockerCount > 0 ? 'CRITICAL' : d.status === 'IN_PROGRESS' ? 'HIGH' : 'MEDIUM',
        plannedUnits: 1.0,
        actualUnits: 0.5,
        whyPendingReason: d.activeBlockerCount > 0 ? 'Active engineering blocker unresolved.' : 'In progress design phase.',
        evidenceFound: Boolean(d.evidenceFileHash),
        evidenceReference: d.evidenceFileHash,
      });
    });

    return items;
  })();

  const totalPending = propTotal ?? displayItems.length;
  const critical = propCritical ?? displayItems.filter((i) => i.priority === 'CRITICAL').length;
  const high = propHigh ?? displayItems.filter((i) => i.priority === 'HIGH').length;

  if (isLoading && !propItems) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl animate-pulse space-y-3">
        <div className="h-6 w-1/3 bg-slate-800 rounded" />
        <div className="h-20 bg-slate-800/60 rounded" />
        <div className="h-20 bg-slate-800/60 rounded" />
      </div>
    );
  }

  if (isError && !propItems) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl space-y-4">
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Failed to load pending work</p>
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
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm tracking-wide">
              Pending Engineering Work & Delivery Risk
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Project: <span className="text-amber-300 font-bold">{projectId}</span> | Total Pending:{' '}
              <span className="text-slate-200 font-bold">{totalPending}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          {critical > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold">
              {critical} Critical
            </span>
          )}
          {high > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
              {high} High
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {displayItems.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 flex flex-col items-center gap-2">
            <Check className="w-6 h-6 text-emerald-400" />
            <span>No pending work or active blockers for project {projectId}.</span>
          </div>
        ) : (
          displayItems.map((item) => {
            const isCritical = item.priority === 'CRITICAL';
            const isHigh = item.priority === 'HIGH';

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-lg border transition-all space-y-2 ${
                  isCritical
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : isHigh
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : 'bg-slate-850/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-300'
                          : isHigh
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.priority}
                    </span>
                    <span className="text-xs font-bold text-slate-200">{item.deliverableName}</span>
                    <span className="text-xs font-mono text-cyan-400">({item.componentCode})</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-medium text-slate-300">{item.responsibleEngineer}</span>
                  </div>
                </div>

                {/* Why Pending Reason */}
                <div className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
                  <span className="font-semibold text-amber-300 mr-1.5">Why Pending:</span>
                  {item.whyPendingReason}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Status: {item.status}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.evidenceFound ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Evidence Attached
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-400">
                        <FileText className="w-3.5 h-3.5" /> Missing Evidence
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
