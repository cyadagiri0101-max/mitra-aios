import React, { useState } from 'react';
import { X, GitBranch } from 'lucide-react';

interface ComponentRevisionModalProps {
  isOpen: boolean;
  componentCode: string;
  onClose: () => void;
  onSubmitRevision: (data: {
    revisionCode: string;
    revisionReason: string;
    description: string;
    incrementalWorkloadUnits: number;
    reworkWorkloadUnits: number;
  }) => void;
}

export const ComponentRevisionModal: React.FC<ComponentRevisionModalProps> = ({
  isOpen,
  componentCode,
  onClose,
  onSubmitRevision,
}) => {
  const [revisionCode, setRevisionCode] = useState('Rev A');
  const [revisionReason, setRevisionReason] = useState('CUSTOMER_ECR');
  const [description, setDescription] = useState('');
  const [incrementalUnits, setIncrementalUnits] = useState(2.0);
  const [reworkUnits, setReworkUnits] = useState(1.5);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitRevision({
      revisionCode,
      revisionReason,
      description,
      incrementalWorkloadUnits: incrementalUnits,
      reworkWorkloadUnits: reworkUnits,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Add Incremental Component Revision</h3>
              <p className="text-xs text-slate-400 font-mono">Component: {componentCode}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Revision Code</label>
              <input
                type="text"
                value={revisionCode}
                onChange={(e) => setRevisionCode(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Revision Reason</label>
              <select
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
              >
                <option value="CUSTOMER_ECR">Customer ECR / ECO</option>
                <option value="DFM_FEEDBACK">DFM Feedback Correction</option>
                <option value="TRIAL_MODIFICATION">Trial Proving Modification</option>
                <option value="DESIGN_ERROR">Engineering Design Correction</option>
                <option value="MANUFACTURING_FIT">Shop Floor Fit / Clearance</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Description / Engineering Changes</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
              placeholder="e.g. Body Insert B rib thickness adjusted from 1.2mm to 1.5mm..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Incremental Workload (Units)</label>
              <input
                type="number"
                step="0.5"
                value={incrementalUnits}
                onChange={(e) => setIncrementalUnits(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Rework Workload (Units)</label>
              <input
                type="number"
                step="0.5"
                value={reworkUnits}
                onChange={(e) => setReworkUnits(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/20"
            >
              Record Incremental Revision
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
