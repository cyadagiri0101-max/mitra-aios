import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Cpu } from 'lucide-react';

export interface ReasoningStepDisplay {
  stepNumber: number;
  stepName: string;
  transformation: string;
  confidence: number;
  inputEvidenceCount: number;
  outputSummary: string;
  status: 'COMPLETE' | 'IN_PROGRESS' | 'PENDING';
}

interface EngineeringReasoningPanelProps {
  steps?: ReasoningStepDisplay[];
  confidenceScore?: number;
  reasoningVersion?: string;
}

const DEFAULT_REASONING_STEPS: ReasoningStepDisplay[] = [
  {
    stepNumber: 1,
    stepName: 'Identify Geometric Finding',
    transformation: 'Extract feature measurements and deterministic DFM rule violations from CAD geometry.',
    confidence: 1.0,
    inputEvidenceCount: 2,
    outputSummary: 'Observed 0.8mm wall vs 1.2mm spec (0.67 deviation ratio)',
    status: 'COMPLETE',
  },
  {
    stepNumber: 2,
    stepName: 'Retrieve Historical Evidence',
    transformation: 'Correlate geometry pattern with shop floor NCRs, trials, and CAPA defect logs.',
    confidence: 0.94,
    inputEvidenceCount: 8,
    outputSummary: 'Retrieved 8 historical NCR records for short-shot defects',
    status: 'COMPLETE',
  },
  {
    stepNumber: 3,
    stepName: 'Evaluate Feature Similarity',
    transformation: 'Quantify geometric cosine similarity against verified benchmark topologies.',
    confidence: 0.94,
    inputEvidenceCount: 2,
    outputSummary: '0.92 topological convergence with ABS injection benchmark',
    status: 'COMPLETE',
  },
  {
    stepNumber: 4,
    stepName: 'Evaluate Material & Process Compatibility',
    transformation: 'Analyze rheology, shrinkage, and thermal cooling gradients for ABS resin profile.',
    confidence: 0.90,
    inputEvidenceCount: 2,
    outputSummary: 'Medium-high viscosity classification; 0.5% shrinkage baseline',
    status: 'COMPLETE',
  },
  {
    stepNumber: 5,
    stepName: 'Evaluate Manufacturing Implications',
    transformation: 'Evaluate mold kinematics, side actions, core pin deflection, and cycle overhead.',
    confidence: 0.88,
    inputEvidenceCount: 1,
    outputSummary: '+3.5s cooling delay per shot and side-action mold load',
    status: 'COMPLETE',
  },
  {
    stepNumber: 6,
    stepName: 'Evaluate Historical Defect Relevance',
    transformation: 'Synthesize root-cause recurrence probability and filter contradictory evidence.',
    confidence: 0.92,
    inputEvidenceCount: 8,
    outputSummary: 'No conflict detected; empirical defect data fully aligns',
    status: 'COMPLETE',
  },
  {
    stepNumber: 7,
    stepName: 'Construct Engineering Assessment',
    transformation: 'Aggregate cross-domain risks into structured engineering impact categories.',
    confidence: 0.91,
    inputEvidenceCount: 5,
    outputSummary: 'High manufacturability & quality risk; moderate tooling load',
    status: 'COMPLETE',
  },
  {
    stepNumber: 8,
    stepName: 'Estimate Operational/Cost Impact',
    transformation: 'Synthesize 6-category governed cost model with 3-point uncertainty ranges.',
    confidence: 0.92,
    inputEvidenceCount: 6,
    outputSummary: 'Expected ₹10,000 cost impact (Range: ₹8,500 to ₹12,500)',
    status: 'COMPLETE',
  },
  {
    stepNumber: 9,
    stepName: 'Generate Explainable Recommendation',
    transformation: 'Formulate governed engineering recommendation with full audit lineage.',
    confidence: 0.95,
    inputEvidenceCount: 1,
    outputSummary: 'Advisory Proposal: Increase wall thickness to ≥ 1.20mm',
    status: 'COMPLETE',
  },
];

export function EngineeringReasoningPanel({
  steps = DEFAULT_REASONING_STEPS,
  confidenceScore = 0.924,
  reasoningVersion = '1.0',
}: EngineeringReasoningPanelProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  return (
    <div className="glass-panel rounded-xl p-4 border border-slate-700/60 bg-slate-950/80 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
            Multi-Step Reasoning Chain (9 Steps)
          </h3>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-gray-400">v{reasoningVersion}</span>
          <span className="px-2 py-0.5 rounded font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
            {(confidenceScore * 100).toFixed(1)}% Confidence
          </span>
        </div>
      </div>

      {/* 9 Step Progression */}
      <div className="space-y-2">
        {steps.map((step) => {
          const isExpanded = expandedStep === step.stepNumber;
          return (
            <div
              key={step.stepNumber}
              className="rounded-lg border border-slate-800/80 bg-slate-900/60 overflow-hidden transition"
            >
              <div
                onClick={() => setExpandedStep(isExpanded ? null : step.stepNumber)}
                className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {step.stepNumber}
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-slate-200">
                      {step.stepName}
                    </span>
                    <p className="text-[11px] text-gray-400 font-mono truncate max-w-[320px]">
                      {step.outputSummary}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {(step.confidence * 100).toFixed(0)}%
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-800 bg-slate-950/40 text-xs space-y-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">
                      Transformation
                    </span>
                    <p className="text-gray-300">{step.transformation}</p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 pt-1">
                    <span>Input Evidence: {step.inputEvidenceCount} items</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Audit Lineage Preserved
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
