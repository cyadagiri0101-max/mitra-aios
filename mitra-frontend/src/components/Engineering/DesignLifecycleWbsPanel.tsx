import React from 'react';
import { Layers, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useWbsComponents } from '../../hooks/useEngineeringData';

export interface StageStateItem {
  stage: string;
  order: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  plannedUnits: number;
  actualUnits: number;
  approvalStatus?: string;
}

interface DesignLifecycleWbsPanelProps {
  packageId?: string;
  packageCode?: string;
  currentStage?: string;
  stages?: StageStateItem[];
  onSelectStage?: (stage: string) => void;
}

const DEFAULT_STAGES: StageStateItem[] = [
  { stage: 'CUSTOMER_INPUTS', order: 1, status: 'COMPLETED', plannedUnits: 3.85, actualUnits: 3.85 },
  { stage: 'KICK_OFF_INPUT_SHEET', order: 2, status: 'COMPLETED', plannedUnits: 3.85, actualUnits: 4.0 },
  { stage: 'LAYOUT', order: 3, status: 'COMPLETED', plannedUnits: 3.85, actualUnits: 3.5 },
  { stage: 'CAVITY_MODEL', order: 4, status: 'COMPLETED', plannedUnits: 3.85, actualUnits: 4.2 },
  { stage: 'MOLD_DESIGN', order: 5, status: 'IN_PROGRESS', plannedUnits: 3.85, actualUnits: 2.0 },
  { stage: 'MASK_DESIGN', order: 6, status: 'NOT_STARTED', plannedUnits: 3.85, actualUnits: 0 },
  { stage: 'DESIGN_REVIEW', order: 7, status: 'NOT_STARTED', plannedUnits: 3.85, actualUnits: 0 },
  { stage: 'CUSTOMER_APPROVAL', order: 8, status: 'NOT_STARTED', plannedUnits: 3.85, actualUnits: 0, approvalStatus: 'PENDING' },
  { stage: 'RAW_MATERIAL', order: 9, status: 'NOT_STARTED', plannedUnits: 3.85, actualUnits: 0 },
  { stage: 'PROCESS_PLANNING', order: 10, status: 'NOT_STARTED', plannedUnits: 3.85, actualUnits: 0 },
  { stage: 'FINAL_PART_LIST', order: 11, status: 'NOT_STARTED', plannedUnits: 3.85, actualUnits: 0 },
  { stage: 'FINAL_DESIGN_REVIEW', order: 12, status: 'NOT_STARTED', plannedUnits: 3.85, actualUnits: 0 },
  { stage: 'DATA_TO_PROGRAMMING', order: 13, status: 'NOT_STARTED', plannedUnits: 3.85, actualUnits: 0 },
  { stage: 'DESIGN_DELIVERY_COMPLETE', order: 14, status: 'NOT_STARTED', plannedUnits: 3.85, actualUnits: 0 },
];

export const DesignLifecycleWbsPanel: React.FC<DesignLifecycleWbsPanelProps> = ({
  packageId,
  packageCode = 'DWP-AUTO-HEADLAMP-001',
  currentStage = 'MOLD_DESIGN',
  stages: propStages,
  onSelectStage,
}) => {
  const { data: components, isLoading } = useWbsComponents(packageId || '');

  const displayStages: StageStateItem[] = propStages || DEFAULT_STAGES;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'IN_PROGRESS':
        return <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />;
      case 'BLOCKED':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-slate-600 ml-1 mr-1" />;
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm tracking-wide">
              Design Lifecycle WBS (14 Stages)
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Package: <span className="text-cyan-300 font-semibold">{packageCode}</span>
              {components && components.length > 0 && (
                <span className="text-slate-400"> | {components.length} Live Components</span>
              )}
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 text-xs rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono font-medium">
          Active: {currentStage}
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-slate-850/60 border border-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
          {displayStages.map((stg) => {
            const isCurrent = stg.stage === currentStage;
            return (
              <div
                key={stg.stage}
                onClick={() => onSelectStage?.(stg.stage)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-850/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500 font-bold">
                      #{stg.order.toString().padStart(2, '0')}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        isCurrent ? 'text-cyan-200 font-semibold' : 'text-slate-300'
                      }`}
                    >
                      {stg.stage.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {getStatusIcon(stg.status)}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/60">
                  <span>Est: {stg.plannedUnits}u</span>
                  <span>Act: {stg.actualUnits}u</span>
                  {stg.approvalStatus && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        stg.approvalStatus === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {stg.approvalStatus}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
