import { useState } from 'react';
import { Check, Edit3, X, Clock, ShieldCheck, AlertCircle } from 'lucide-react';

export interface RecommendationDetails {
  id: string;
  type: string;
  title: string;
  description: string;
  rationale: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedCostImpact: number | null;
  currency: string;
  status: 'PENDING' | 'ACCEPTED' | 'MODIFIED' | 'REJECTED' | 'CANCELLED';
}

interface HumanReviewActionCenterProps {
  recommendation?: RecommendationDetails;
  onReviewDecision: (decision: 'ACCEPTED' | 'MODIFIED' | 'REJECTED' | 'CANCELLED', notes: string) => void;
}

const DEFAULT_RECOMMENDATION: RecommendationDetails = {
  id: 'REC-DFM-WALL-001',
  type: 'INCREASE_WALL_THICKNESS',
  title: 'Increase Nominal Wall Thickness to ≥ 1.20mm',
  description: 'Thicken localized cavity wall section from 0.80mm to at least 1.20mm to prevent polymer freeze-off and short-shots during molding.',
  rationale: 'Evidence-grounded assessment indicates 0.8mm wall violates DFM design threshold. Historical shop floor NCRs in ABS parts report 85% short-shot frequency.',
  priority: 'CRITICAL',
  estimatedCostImpact: 10000,
  currency: 'INR',
  status: 'PENDING',
};

export function HumanReviewActionCenter({
  recommendation = DEFAULT_RECOMMENDATION,
  onReviewDecision,
}: HumanReviewActionCenterProps) {
  const [selectedDecision, setSelectedDecision] = useState<'ACCEPTED' | 'MODIFIED' | 'REJECTED' | 'CANCELLED' | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenDecisionModal = (decision: 'ACCEPTED' | 'MODIFIED' | 'REJECTED' | 'CANCELLED') => {
    setSelectedDecision(decision);
    setDecisionNotes('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleConfirmDecision = () => {
    if (!decisionNotes.trim()) {
      setErrorMsg('Decision notes and engineering rationale are mandatory.');
      return;
    }
    if (selectedDecision) {
      onReviewDecision(selectedDecision, decisionNotes);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="glass-panel rounded-xl p-5 border-2 border-emerald-500/40 bg-slate-950/90 space-y-4">
      {/* Governance Safety Invariant Banner */}
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs">
        <div className="flex items-center gap-2 text-emerald-300 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Hard Governance Invariant Active</span>
        </div>
        <span className="text-[11px] font-mono text-emerald-400/80">
          AI Advises • Engineer Decides • Zero Autonomous CAD Mutation
        </span>
      </div>

      {/* Advisory Proposal Card */}
      <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 uppercase">
              {recommendation.priority} PRIORITY
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              {recommendation.id}
            </span>
          </div>
          <span className="text-xs font-mono text-gray-400">
            Est. Cost Impact:{' '}
            <span className="font-bold text-emerald-400">
              ₹{recommendation.estimatedCostImpact?.toLocaleString() ?? '—'}
            </span>
          </span>
        </div>

        <h4 className="text-base font-bold text-slate-100">{recommendation.title}</h4>
        <p className="text-xs text-gray-300">{recommendation.description}</p>
        <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 text-xs text-gray-400">
          <span className="font-bold text-slate-300 block mb-0.5">Engineering Rationale:</span>
          {recommendation.rationale}
        </div>
      </div>

      {/* Human Review Actions */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-xs text-gray-400">
          Status:{' '}
          <span className="font-mono font-bold text-amber-400 uppercase">
            {recommendation.status === 'PENDING' ? 'UNDER_REVIEW' : recommendation.status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenDecisionModal('ACCEPTED')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow"
          >
            <Check className="w-3.5 h-3.5" /> Accept Proposal
          </button>
          <button
            onClick={() => handleOpenDecisionModal('MODIFIED')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow"
          >
            <Edit3 className="w-3.5 h-3.5" /> Modify
          </button>
          <button
            onClick={() => handleOpenDecisionModal('REJECTED')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-700 hover:bg-rose-600 text-white transition shadow"
          >
            <X className="w-3.5 h-3.5" /> Reject
          </button>
          <button
            onClick={() => handleOpenDecisionModal('CANCELLED')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-gray-300 transition"
          >
            <Clock className="w-3.5 h-3.5" /> Defer
          </button>
        </div>
      </div>

      {/* Mandatory Decision Notes Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl glass-panel p-6 border border-slate-700 bg-slate-950 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Record Engineering Decision: {selectedDecision}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Mandatory Engineering Notes & Decision Rationale:
              </label>
              <textarea
                rows={4}
                placeholder="Provide engineering technical justification for this decision..."
                value={decisionNotes}
                onChange={(e) => {
                  setDecisionNotes(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
              />
              {errorMsg && (
                <p className="text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errorMsg}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDecision}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow"
              >
                Submit Decision to Audit Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
