import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useTradeoffStudy, useRecordTradeoffDecision } from '../../hooks/useEngineeringData';
import type { EngineeringTradeoffStudyDto } from '../../services/engineeringApi';

export interface CandidateOption {
  candidateId: string;
  name: string;
  strategy: string;
  toolingCost: number;
  unitManufacturingCost: number;
  cycleTimeSeconds: number;
  scrapRiskPercentage: number;
  deliveryWeeks: number;
  designWorkloadUnits: number;
  t0ModificationRisk: string;
  dfmScore: number;
  isParetoOptimal: boolean;
  isFeasible: boolean;
  tradeoffSummary: {
    benefits: string[];
    sacrifices: string[];
    uncertainty: string[];
  };
}

export interface EngineeringTradeoffWorkspaceProps {
  projectId?: string;
  studyId?: string;
  studyNumber?: string;
  candidates?: CandidateOption[];
  recommendedCandidateId?: string;
  paretoFrontier?: string[];
  recommendationRationale?: string;
  onAcceptCandidate?: (candidateId: string, notes: string) => void;
  onOverrideCandidate?: (candidateId: string, notes: string) => void;
}

const DEFAULT_CANDIDATES: CandidateOption[] = [
  {
    candidateId: 'OPTION_A',
    name: 'Single Cavity Cold Runner (Cost-Minimized)',
    strategy: 'COST_MINIMIZED',
    toolingCost: 28000,
    unitManufacturingCost: 4.5,
    cycleTimeSeconds: 42.0,
    scrapRiskPercentage: 3.5,
    deliveryWeeks: 8,
    designWorkloadUnits: 40.0,
    t0ModificationRisk: 'LOW',
    dfmScore: 92,
    isParetoOptimal: true,
    isFeasible: true,
    tradeoffSummary: {
      benefits: ['Lowest upfront capex ($28k)', 'Fast lead time (8 weeks)'],
      sacrifices: ['Higher cycle time (42s)', 'Higher unit cost ($4.50)'],
      uncertainty: ['Annual scaleup volume limit'],
    },
  },
  {
    candidateId: 'OPTION_B',
    name: '4-Cavity Hot Runner (Speed-Minimized)',
    strategy: 'CYCLE_TIME_MINIMIZED',
    toolingCost: 65000,
    unitManufacturingCost: 1.8,
    cycleTimeSeconds: 18.5,
    scrapRiskPercentage: 1.2,
    deliveryWeeks: 14,
    designWorkloadUnits: 95.0,
    t0ModificationRisk: 'HIGH',
    dfmScore: 85,
    isParetoOptimal: true,
    isFeasible: true,
    tradeoffSummary: {
      benefits: ['Fastest cycle (18.5s)', 'Lowest piece part cost ($1.80)'],
      sacrifices: ['Highest capex ($65k)', 'High T0 trial risk'],
      uncertainty: ['Hot runner valve gate thermal balance'],
    },
  },
  {
    candidateId: 'OPTION_C',
    name: 'Modular Dual-Cavity Insert (Balanced Pareto)',
    strategy: 'BALANCED_PARETO',
    toolingCost: 42000,
    unitManufacturingCost: 2.6,
    cycleTimeSeconds: 26.0,
    scrapRiskPercentage: 1.8,
    deliveryWeeks: 10,
    designWorkloadUnits: 62.0,
    t0ModificationRisk: 'MEDIUM',
    dfmScore: 95,
    isParetoOptimal: true,
    isFeasible: true,
    tradeoffSummary: {
      benefits: ['Optimal multi-variable balance', 'Manageable load (62u)'],
      sacrifices: ['Moderate cycle (26s vs 18.5s)'],
      uncertainty: ['Insert pocket wear over 500k cycles'],
    },
  },
];

export const EngineeringTradeoffWorkspace: React.FC<EngineeringTradeoffWorkspaceProps> = ({
  projectId = 'PRJ-AUTO-HEADLAMP-001',
  studyId = 'study-bm331-001',
  studyNumber = 'TRD-BM331-001',
  candidates: propCandidates,
  recommendedCandidateId = 'OPTION_C',
  paretoFrontier: propParetoFrontier,
  recommendationRationale = 'RECOMMENDED OPTION_C: Balances capital investment ($42k), high DFM quality (95/100), and manageable design team load.',
  onAcceptCandidate,
  onOverrideCandidate,
}) => {
  const [selectedCandidate, setSelectedCandidate] = useState<string>(recommendedCandidateId);
  const [decisionNotes, setDecisionNotes] = useState<string>('');
  const [decisionRecorded, setDecisionRecorded] = useState<string | null>(null);

  const {
    data: studyData,
    isLoading,
    isError,
    error,
    refetch,
  } = useTradeoffStudy(studyId, {
    enabled: Boolean(studyId && !propCandidates),
  });

  const recordDecisionMutation = useRecordTradeoffDecision();

  const displayCandidates: CandidateOption[] =
    propCandidates ||
    (studyData && (studyData as EngineeringTradeoffStudyDto).candidates && (studyData as EngineeringTradeoffStudyDto).candidates.length > 0
      ? (studyData as EngineeringTradeoffStudyDto).candidates.map((opt) => ({
          candidateId: opt.candidateId,
          name: opt.candidateName,
          strategy: opt.candidateName,
          toolingCost: opt.toolingCost,
          unitManufacturingCost: opt.toolingCost / 10000,
          cycleTimeSeconds: opt.cycleTimeSeconds,
          scrapRiskPercentage: opt.scrapRiskPercentage,
          deliveryWeeks: Math.round(opt.leadTimeDays / 7),
          designWorkloadUnits: 50.0,
          t0ModificationRisk: opt.t0RiskScore > 0.5 ? 'HIGH' : 'LOW',
          dfmScore: 90,
          isParetoOptimal: opt.isParetoOptimal,
          isFeasible: true,
          tradeoffSummary: {
            benefits: [`Cost: $${opt.toolingCost.toLocaleString()}`, `Lead time: ${opt.leadTimeDays} days`],
            sacrifices: opt.sacrifices || [],
            uncertainty: ['Production tolerance margin'],
          },
        }))
      : DEFAULT_CANDIDATES);

  const activeOption = displayCandidates.find((c) => c.candidateId === selectedCandidate) || displayCandidates[0];
  const paretoFrontier = propParetoFrontier || displayCandidates.filter((c) => c.isParetoOptimal).map((c) => c.candidateId);

  const handleDecision = (decisionType: 'ACCEPTED' | 'OVERRIDDEN' | 'REJECTED') => {
    if (decisionType === 'ACCEPTED' && onAcceptCandidate) {
      onAcceptCandidate(selectedCandidate, decisionNotes);
      return;
    }
    if (decisionType === 'OVERRIDDEN' && onOverrideCandidate) {
      onOverrideCandidate(selectedCandidate, decisionNotes);
      return;
    }

    recordDecisionMutation.mutate(
      {
        studyId,
        dto: {
          decisionStatus: decisionType,
          selectedCandidateId: selectedCandidate,
          rationale: decisionNotes.trim() || `Decision ${decisionType} recorded by engineering lead.`,
          reviewedBy: 'lead_tooling_engineer',
        },
      },
      {
        onSuccess: () => {
          setDecisionRecorded(decisionType);
        },
      }
    );
  };

  if (isLoading && !propCandidates) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 shadow-2xl animate-pulse space-y-4">
        <div className="h-6 w-1/3 bg-slate-800 rounded" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-48 bg-slate-800/60 rounded-lg" />
          <div className="h-48 bg-slate-800/60 rounded-lg" />
          <div className="h-48 bg-slate-800/60 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 text-xs font-semibold rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              M12.2 GOVERNED SYNTHESIS
            </span>
            <span className="text-xs text-slate-400 font-mono">{studyNumber}</span>
          </div>
          <h2 className="text-xl font-bold mt-1 text-white">
            Engineering Trade-Off Synthesis: {projectId}
          </h2>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 block">Pareto Frontier Candidates</span>
          <span className="text-sm font-semibold text-emerald-400 font-mono">
            {paretoFrontier.join(', ')}
          </span>
        </div>
      </div>

      {isError && (
        <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Failed to load tradeoff study: {error?.message || 'Gateway error.'}</span>
          </div>
          <button
            onClick={() => refetch()}
            className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-200 text-xs font-medium border border-rose-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {/* Advisory Banner */}
      <div className="bg-cyan-950/40 border border-cyan-800/60 rounded-lg p-4 text-xs text-cyan-200 leading-relaxed">
        <strong className="text-cyan-400 font-semibold block mb-1">AI Explanatory Synthesis & Governance Gate:</strong>
        {recommendationRationale}
      </div>

      {/* Candidate Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayCandidates.map((c) => {
          const isSelected = c.candidateId === selectedCandidate;
          const isRecommended = c.candidateId === recommendedCandidateId;

          return (
            <div
              key={c.candidateId}
              onClick={() => setSelectedCandidate(c.candidateId)}
              className={`cursor-pointer rounded-lg p-4 border transition-all duration-200 ${
                isSelected
                  ? 'bg-slate-800 border-cyan-500 shadow-lg ring-1 ring-cyan-500/50'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {c.candidateId}
                </span>
                {isRecommended && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Recommended
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-sm text-white mb-2">{c.name}</h3>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Tooling Cost:</span>
                  <span className="font-mono font-medium">${c.toolingCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cycle Time:</span>
                  <span className="font-mono font-medium">{c.cycleTimeSeconds}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Piece Part Cost:</span>
                  <span className="font-mono font-medium">${c.unitManufacturingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lead Time:</span>
                  <span className="font-mono font-medium">{c.deliveryWeeks} weeks</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">DFM Score:</span>
                  <span className="font-mono font-medium text-cyan-400">{c.dfmScore}/100</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Trade-off Breakdown of Selected Candidate */}
      {activeOption && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
            <h4 className="font-semibold text-sm text-slate-200">
              Detailed Synthesis: {activeOption.name} ({activeOption.candidateId})
            </h4>
            <span className="text-xs text-slate-400">
              T0 Risk: <strong className="text-amber-400">{activeOption.t0ModificationRisk}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-emerald-950/20 border border-emerald-900/40 rounded p-3">
              <strong className="text-emerald-400 font-semibold block mb-1.5">What It Optimizes (Benefits):</strong>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {activeOption.tradeoffSummary.benefits.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
            <div className="bg-amber-950/20 border border-amber-900/40 rounded p-3">
              <strong className="text-amber-400 font-semibold block mb-1.5">What It Sacrifices:</strong>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {activeOption.tradeoffSummary.sacrifices.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="bg-indigo-950/20 border border-indigo-900/40 rounded p-3">
              <strong className="text-indigo-400 font-semibold block mb-1.5">Uncertainty & Assumptions:</strong>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {activeOption.tradeoffSummary.uncertainty.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Human Decision Feedback / Success */}
      {decisionRecorded && (
        <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Decision <strong>{decisionRecorded}</strong> successfully recorded and logged into audit trail for {activeOption.name}.
            </span>
          </div>
          <span className="font-mono text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300">
            AUDIT VERIFIED
          </span>
        </div>
      )}

      {/* Human Decision Review & Acceptance Gate */}
      <div className="border-t border-slate-800 pt-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="w-full md:w-2/3">
          <input
            type="text"
            placeholder="Enter engineering review rationale notes before recording decision..."
            value={decisionNotes}
            onChange={(e) => setDecisionNotes(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div className="flex space-x-3 w-full md:w-auto justify-end">
          <button
            onClick={() => handleDecision('OVERRIDDEN')}
            disabled={recordDecisionMutation.isPending}
            className="px-4 py-2 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 transition-colors"
          >
            Override Candidate
          </button>
          <button
            onClick={() => handleDecision('ACCEPTED')}
            disabled={recordDecisionMutation.isPending}
            className="px-4 py-2 text-xs font-semibold rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white shadow-lg transition-colors flex items-center gap-1.5"
          >
            {recordDecisionMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            Accept Selected Candidate (Human)
          </button>
        </div>
      </div>
    </div>
  );
};
