import React, { useState } from 'react';
import { Camera, FileText } from 'lucide-react';
import type {
  EnterprisePortfolioSnapshotDto,
  CreatePortfolioSnapshotDto,
} from '../../services/engineeringApi';

interface PortfolioSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: EnterprisePortfolioSnapshotDto | null;
  isLoading?: boolean;
  onCreateSnapshot: (dto: CreatePortfolioSnapshotDto) => Promise<EnterprisePortfolioSnapshotDto>;
}

export const PortfolioSnapshotModal: React.FC<PortfolioSnapshotModalProps> = ({
  isOpen,
  onClose,
  snapshot,
  isLoading,
  onCreateSnapshot,
}) => {
  const [snapshotName, setSnapshotName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsGenerating(true);
      await onCreateSnapshot({
        snapshotName: snapshotName || `Snapshot-${new Date().toISOString().slice(0, 10)}`,
      });
      setSnapshotName('');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Portfolio Snapshot Baseline
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  AUTHORITATIVE RECORD
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Immutable milestone record of cross-project demand, capacity, and bottleneck states.
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

        {/* Generate Snapshot Form */}
        <form onSubmit={handleGenerate} className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 mb-5">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Capture New Milestone Snapshot
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. Q3 Program Freeze Milestone"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isGenerating}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              {isGenerating ? 'Capturing...' : 'Capture Snapshot'}
            </button>
          </div>
        </form>

        {/* Latest Snapshot Details */}
        {isLoading ? (
          <div className="animate-pulse space-y-3 p-4 bg-slate-800/20 rounded-xl">
            <div className="h-4 w-1/3 bg-slate-800 rounded" />
            <div className="h-16 bg-slate-800/60 rounded" />
          </div>
        ) : snapshot ? (
          <div className="space-y-3 bg-slate-800/30 p-4 rounded-xl border border-slate-700/40">
            <div className="flex items-center justify-between border-b border-slate-700/40 pb-2">
              <div>
                <h4 className="font-semibold text-sm text-slate-100">{snapshot.snapshotName}</h4>
                <span className="text-[11px] text-slate-400 font-mono">
                  Captured: {new Date(snapshot.createdAt).toLocaleString()} by {snapshot.generatedBy || 'SYSTEM'}
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                {snapshot.snapshotType}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center pt-1">
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] uppercase text-slate-400 font-mono">Demand Hours</span>
                <p className="text-sm font-bold text-cyan-400 mt-0.5">
                  {Math.round(snapshot.demandSummary?.totalDemandHours || 0)}h
                </p>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] uppercase text-slate-400 font-mono">Capacity Hours</span>
                <p className="text-sm font-bold text-emerald-400 mt-0.5">
                  {Math.round(snapshot.capacitySummary?.totalAvailableCapacityHours || 0)}h
                </p>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] uppercase text-slate-400 font-mono">Utilization</span>
                <p className="text-sm font-bold text-amber-400 mt-0.5">
                  {(snapshot.capacitySummary?.overallUtilizationPercentage || 0).toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>{snapshot.includedProjectIds?.length || 0} Programs Captured</span>
              <span>{snapshot.bottlenecks?.length || 0} Bottlenecks Recorded</span>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500">
            <FileText className="w-8 h-8 mb-2 opacity-50 text-slate-400 mx-auto" />
            <p className="text-sm font-medium text-slate-400">No snapshot baselines recorded.</p>
            <p className="text-xs text-slate-500 mt-1">Capture a snapshot above to freeze the portfolio baseline.</p>
          </div>
        )}

        <div className="flex items-center justify-end pt-4 border-t border-slate-800 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
