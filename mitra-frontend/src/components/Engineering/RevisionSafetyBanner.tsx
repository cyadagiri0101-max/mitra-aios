import { ShieldCheck, AlertTriangle, GitBranch } from 'lucide-react';

interface RevisionSafetyBannerProps {
  drawingId: string;
  drawingName?: string;
  activeRevision: string;
  analysisRevision: string;
  isStale?: boolean;
}

export function RevisionSafetyBanner({
  drawingId,
  drawingName = 'TOOL-2026-CORE-CAVITY',
  activeRevision = 'Rev B',
  analysisRevision = 'Rev B',
  isStale = false,
}: RevisionSafetyBannerProps) {
  const isMismatch = activeRevision !== analysisRevision || isStale;

  return (
    <div
      className={`p-3 rounded-xl flex items-center justify-between border ${
        isMismatch
          ? 'bg-amber-950/60 border-amber-800 text-amber-300'
          : 'bg-slate-900/80 border-slate-700/60 text-slate-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isMismatch ? 'bg-amber-900/60 text-amber-400' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
          }`}
        >
          <GitBranch className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono text-white">{drawingName}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700 font-bold">
              Active: {activeRevision}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-gray-300 border border-slate-700">
              Analysis: {analysisRevision}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Drawing ID: <span className="font-mono">{drawingId}</span> • 3D STEP Solid Synchronized
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isMismatch ? (
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 font-mono">
            <AlertTriangle className="w-4 h-4" />
            <span>REVISION MISMATCH DETECTED</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 font-mono">
            <ShieldCheck className="w-4 h-4" />
            <span>REVISION MATCH VERIFIED</span>
          </div>
        )}
      </div>
    </div>
  );
}
