import { CheckCircle, ShieldAlert, Sliders } from 'lucide-react';

export interface ContradictionDisplay {
  contradictionId: string;
  state: 'NO_CONFLICT' | 'CONFLICT_PRESENT' | 'INSUFFICIENT_EVIDENCE' | 'REQUIRES_ENGINEERING_REVIEW';
  description: string;
  resolutionNotes: string | null;
}

export interface AssumptionDisplay {
  assumptionId: string;
  description: string;
  source: string;
  status: 'VERIFIED' | 'UNVERIFIED_ASSUMPTION';
  impactOnConfidence: number;
}

interface ContradictionAssumptionPanelProps {
  contradictions?: ContradictionDisplay[];
  assumptions?: AssumptionDisplay[];
  confidenceFactors?: {
    evidenceQuality: number;
    featureRelevance: number;
    historicalRelevance: number;
    contextCompleteness: number;
    sourceAuthority: number;
  };
}

const DEFAULT_CONTRADICTIONS: ContradictionDisplay[] = [
  {
    contradictionId: 'CONTRA-00',
    state: 'NO_CONFLICT',
    description: 'Empirical shop floor defect records and deterministic CAD DFM rules are in complete agreement.',
    resolutionNotes: 'Empirical data corroborates deterministic rule violation.',
  },
];

const DEFAULT_ASSUMPTIONS: AssumptionDisplay[] = [
  {
    assumptionId: 'ASSUMP-MAT-01',
    description: 'Material configured as ABS polymer resin (density: 1.05 g/cm³)',
    source: 'Project Material Master',
    status: 'VERIFIED',
    impactOnConfidence: 0.0,
  },
  {
    assumptionId: 'ASSUMP-PROC-01',
    description: 'Manufacturing process set as Injection Molding with side-action cores',
    source: 'Process Routing Master',
    status: 'VERIFIED',
    impactOnConfidence: 0.0,
  },
];

export function ContradictionAssumptionPanel({
  contradictions = DEFAULT_CONTRADICTIONS,
  assumptions = DEFAULT_ASSUMPTIONS,
  confidenceFactors = {
    evidenceQuality: 0.95,
    featureRelevance: 0.92,
    historicalRelevance: 0.94,
    contextCompleteness: 1.0,
    sourceAuthority: 0.95,
  },
}: ContradictionAssumptionPanelProps) {
  const primaryContra = contradictions[0] || DEFAULT_CONTRADICTIONS[0];

  const getContradictionColor = (state: string) => {
    switch (state) {
      case 'NO_CONFLICT':
        return { badge: 'bg-emerald-950 text-emerald-300 border-emerald-800', dot: 'bg-emerald-400' };
      case 'CONFLICT_PRESENT':
        return { badge: 'bg-red-950 text-red-400 border-red-800', dot: 'bg-red-500' };
      case 'INSUFFICIENT_EVIDENCE':
        return { badge: 'bg-amber-950 text-amber-400 border-amber-800', dot: 'bg-amber-400' };
      default:
        return { badge: 'bg-purple-950 text-purple-400 border-purple-800', dot: 'bg-purple-400' };
    }
  };

  const contraColor = getContradictionColor(primaryContra.state);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Contradiction Governance */}
      <div className="glass-panel rounded-xl p-4 border border-slate-700/60 bg-slate-950/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Contradiction Governance
            </h3>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${contraColor.badge}`}>
            {primaryContra.state}
          </span>
        </div>
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${contraColor.dot}`} />
            <span className="font-semibold text-slate-200">{primaryContra.state}</span>
          </div>
          <p className="text-gray-400 text-[11px]">{primaryContra.description}</p>
          {primaryContra.resolutionNotes && (
            <p className="text-emerald-400 text-[11px] mt-2 font-mono">
              Note: {primaryContra.resolutionNotes}
            </p>
          )}
        </div>
      </div>

      {/* 2. Assumption Governance */}
      <div className="glass-panel rounded-xl p-4 border border-slate-700/60 bg-slate-950/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Assumption Governance
            </h3>
          </div>
          <span className="text-[10px] font-mono text-gray-400">
            {assumptions.filter((a) => a.status === 'VERIFIED').length}/{assumptions.length} Verified
          </span>
        </div>
        <div className="space-y-2">
          {assumptions.map((assump) => (
            <div
              key={assump.assumptionId}
              className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
            >
              <div className="pr-2">
                <span className="text-slate-200 block text-[11px] font-medium">
                  {assump.description}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">{assump.source}</span>
              </div>
              <span
                className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase border flex-shrink-0 ${
                  assump.status === 'VERIFIED'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : 'bg-amber-950 text-amber-400 border-amber-800'
                }`}
              >
                {assump.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Deterministic Confidence Model */}
      <div className="glass-panel rounded-xl p-4 border border-slate-700/60 bg-slate-950/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Multi-Factor Confidence
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">92.4% Verified</span>
        </div>
        <div className="space-y-1.5 text-xs font-mono">
          <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60">
            <span className="text-gray-400">Evidence Quality (25%)</span>
            <span className="text-emerald-400 font-bold">{(confidenceFactors.evidenceQuality * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60">
            <span className="text-gray-400">Topological Feature (25%)</span>
            <span className="text-emerald-400 font-bold">{(confidenceFactors.featureRelevance * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60">
            <span className="text-gray-400">Historical Relevance (20%)</span>
            <span className="text-emerald-400 font-bold">{(confidenceFactors.historicalRelevance * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60">
            <span className="text-gray-400">Context & Authority (30%)</span>
            <span className="text-emerald-400 font-bold">{(confidenceFactors.sourceAuthority * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
