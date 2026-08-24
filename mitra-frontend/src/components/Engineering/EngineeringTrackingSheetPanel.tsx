import React from 'react';
import { FileSpreadsheet, Layers, AlertCircle, RefreshCw } from 'lucide-react';
import { useTrackingReconciliation } from '../../hooks/useEngineeringData';

export interface TrackingSheetSummaryItem {
  id: string;
  sheetTitle: string;
  sheetType: string;
  sourceFileName: string;
  sourceFileHash: string;
  activeRevision: string;
  totalRowsCount: number;
  uploadedBy?: string;
  createdAt: string;
}

interface EngineeringTrackingSheetPanelProps {
  projectId: string;
  trackingSheets?: TrackingSheetSummaryItem[];
  onImportSheet?: () => void;
  onReconcile?: () => void;
}

export const EngineeringTrackingSheetPanel: React.FC<EngineeringTrackingSheetPanelProps> = ({
  projectId,
  trackingSheets: propSheets,
  onImportSheet,
  onReconcile,
}) => {
  const { data: reconciliation, isLoading, isError, error, refetch } = useTrackingReconciliation(
    projectId,
    { enabled: Boolean(projectId && !propSheets) }
  );

  const displaySheets: TrackingSheetSummaryItem[] = propSheets || (reconciliation ? [
    {
      id: `ts-${projectId}`,
      sheetTitle: `Tracking Sheet — ${projectId}`,
      sheetType: 'PROJECT_TRACKING',
      sourceFileName: `PL_${projectId}.xlsx`,
      sourceFileHash: 'e0566f0f72...368b72e405',
      activeRevision: 'Rev A',
      totalRowsCount: reconciliation.totalTrackingRows,
      uploadedBy: 'engineering_lead',
      createdAt: '2026-08-24T00:00:00Z',
    },
  ] : []);

  if (isLoading && !propSheets) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl animate-pulse space-y-3">
        <div className="h-6 w-1/3 bg-slate-800 rounded" />
        <div className="h-16 bg-slate-800/60 rounded-lg" />
      </div>
    );
  }

  if (isError && !propSheets) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl space-y-4">
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Failed to load tracking sheet intelligence</p>
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
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm tracking-wide">
              Engineering Tracking Sheet Intelligence
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Project: <span className="text-emerald-300 font-bold">{projectId}</span> | Active Sheets:{' '}
              <span className="text-slate-200 font-bold">{displaySheets.length}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onReconcile && (
            <button
              onClick={onReconcile}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Reconcile Truth
            </button>
          )}
          {onImportSheet && (
            <button
              onClick={onImportSheet}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-600/20"
            >
              Import Sheet
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
        {displaySheets.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            No tracking sheets imported for this project yet.
          </div>
        ) : (
          displaySheets.map((s) => (
            <div
              key={s.id}
              className="p-3 rounded-lg bg-slate-850/60 border border-slate-800 space-y-1.5 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200">{s.sheetTitle}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                    {s.sheetType}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                  {s.activeRevision}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>File: {s.sourceFileName}</span>
                <span>{s.totalRowsCount} Rows</span>
                <span className="text-slate-500">Hash: {s.sourceFileHash.slice(0, 10)}...</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
