import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, FileSpreadsheet, ShieldAlert, RefreshCw, Check } from 'lucide-react';
import { useTrackingReconciliation, useApplyAutoReconciliation } from '../../hooks/useEngineeringData';

export interface ReconciliationResultData {
  projectId: string;
  reconciliationStatus: string;
  totalItems: number;
  fullyVerifiedCount: number;
  missingEvidenceCount: number;
  unverifiedCompletionCount: number;
  statusMismatchCount: number;
  discrepancies: Array<{
    itemType: string;
    identifier: string;
    trackingSheetStatus?: string;
    mitraStatus?: string;
    evidenceFound: boolean;
    isVerified: boolean;
    discrepancyReason: string;
    suggestedAction: string;
  }>;
}

interface TrackingReconciliationPanelProps {
  projectId?: string;
  data?: ReconciliationResultData | null;
}

export const TrackingReconciliationPanel: React.FC<TrackingReconciliationPanelProps> = ({
  projectId = 'PRJ-AUTO-HEADLAMP-001',
  data: propData,
}) => {
  const [isApplying, setIsApplying] = useState(false);

  const {
    data: reconciliation,
    isLoading,
    isError,
    error,
    refetch,
  } = useTrackingReconciliation(projectId, {
    enabled: Boolean(projectId && !propData),
  });

  const applyMutation = useApplyAutoReconciliation();

  const activeData: ReconciliationResultData | null =
    propData ||
    (reconciliation
      ? {
          projectId,
          reconciliationStatus: reconciliation.discrepanciesCount === 0 ? 'RECONCILED' : 'DISCREPANCY_DETECTED',
          totalItems: reconciliation.totalTrackingRows,
          fullyVerifiedCount: reconciliation.matchedDeliverablesCount,
          missingEvidenceCount: reconciliation.discrepancies.filter((d) => d.discrepancyType === 'HASH_DRIFT').length,
          unverifiedCompletionCount: reconciliation.discrepancies.filter((d) => d.discrepancyType === 'MISSING_IN_SYSTEM').length,
          statusMismatchCount: reconciliation.discrepancies.filter((d) => d.discrepancyType === 'STATUS_MISMATCH').length,
          discrepancies: reconciliation.discrepancies.map((d) => ({
            itemType: d.discrepancyType,
            identifier: d.componentCode || d.trackingSheetRowId,
            trackingSheetStatus: d.sheetStatus,
            mitraStatus: d.systemStatus,
            evidenceFound: d.discrepancyType !== 'HASH_DRIFT',
            isVerified: false,
            discrepancyReason: `${d.discrepancyType}: Sheet='${d.sheetStatus}' vs System='${d.systemStatus}'`,
            suggestedAction: d.suggestedResolution,
          })),
        }
      : null);

  const handleApplyReconciliation = () => {
    if (!reconciliation || reconciliation.discrepancies.length === 0) return;
    setIsApplying(true);
    applyMutation.mutate(
      {
        projectId,
        discrepancyIds: reconciliation.discrepancies.map((d) => d.trackingSheetRowId),
      },
      {
        onSettled: () => setIsApplying(false),
      }
    );
  };

  if (isLoading && !propData) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl animate-pulse space-y-3">
        <div className="h-6 w-1/3 bg-slate-800 rounded" />
        <div className="grid grid-cols-4 gap-3">
          <div className="h-16 bg-slate-800/60 rounded" />
          <div className="h-16 bg-slate-800/60 rounded" />
          <div className="h-16 bg-slate-800/60 rounded" />
          <div className="h-16 bg-slate-800/60 rounded" />
        </div>
      </div>
    );
  }

  if (isError && !propData) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl space-y-4">
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Failed to reconcile tracking truth</p>
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

  if (!activeData) return null;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm tracking-wide">
              Planned vs Actual vs Evidence Truth Reconciliation
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Project: <span className="text-indigo-300 font-bold">{activeData.projectId}</span> | Total Items:{' '}
              <span className="text-slate-200 font-bold">{activeData.totalItems}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border ${
              activeData.reconciliationStatus === 'RECONCILED'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}
          >
            {activeData.reconciliationStatus}
          </span>
          {activeData.discrepancies.length > 0 && (
            <button
              onClick={handleApplyReconciliation}
              disabled={isApplying || applyMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              {isApplying ? 'Applying...' : 'Apply Reconciliation (Human)'}
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-slate-850/60 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Fully Verified</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400 font-mono">
            {activeData.fullyVerifiedCount}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-850/60 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Missing Evidence</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-lg font-bold text-rose-400 font-mono">
            {activeData.missingEvidenceCount}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-850/60 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Status Mismatches</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-amber-400 font-mono">
            {activeData.statusMismatchCount}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-850/60 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Unverified Completion</span>
            <AlertTriangle className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-bold text-cyan-400 font-mono">
            {activeData.unverifiedCompletionCount}
          </div>
        </div>
      </div>

      {/* Discrepancies list */}
      {activeData.discrepancies.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <h4 className="text-xs font-bold text-slate-300">Detected Reconciliation Discrepancies</h4>
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {activeData.discrepancies.map((disc, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded bg-slate-850/70 border border-slate-800 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">{disc.identifier}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                    {disc.itemType}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px]">{disc.discrepancyReason}</div>
                <div className="text-cyan-400 text-[11px] font-medium">
                  Action: {disc.suggestedAction}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
