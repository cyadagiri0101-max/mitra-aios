import { motion } from 'framer-motion';
import { Check, Loader2, Circle } from 'lucide-react';

export interface StageNode {
  code: string;
  label: string;
  count?: number;
  status: 'completed' | 'current' | 'pending' | 'skipped';
}

interface WorkflowTimelineProps {
  stages: StageNode[];
  overallProgress?: number;
  className?: string;
}

export function WorkflowTimeline({ stages, overallProgress: _overallProgress = 0, className = '' }: WorkflowTimelineProps) {
  const completedCount = stages.filter(s => s.status === 'completed').length;
  const totalActive = stages.filter(s => s.status !== 'skipped').length;
  const progressPercent = totalActive > 0 ? (completedCount / totalActive) * 100 : 0;

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Project Lifecycle Overview</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Overall Progress</span>
          <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700">{Math.round(progressPercent)}%</span>
        </div>
      </div>

      <div className="relative">
        {/* Connecting line */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-slate-200">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 via-blue-500 to-slate-300"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
          />
        </div>

        <div className="flex items-center justify-between relative">
          {stages.map((stage, index) => {
            const isCompleted = stage.status === 'completed';
            const isCurrent = stage.status === 'current';
            const isPending = stage.status === 'pending';
            const isSkipped = stage.status === 'skipped';

            return (
              <div key={stage.code} className="flex flex-col items-center relative z-10">
                {/* Node */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                  className={`relative w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-200'
                      : isCurrent
                        ? 'bg-blue-50 border-blue-500 shadow-lg shadow-blue-200'
                        : isSkipped
                          ? 'bg-slate-100 border-slate-300'
                          : 'bg-white border-slate-300'
                  }`}
                >
                  {isCompleted && (
                    <Check className="w-5 h-5 text-white" strokeWidth={3} />
                  )}
                  {isCurrent && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-blue-400"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  {isCurrent && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
                  {isPending && <Circle className="w-5 h-5 text-slate-400" />}
                  {isSkipped && <span className="text-xs text-slate-400">—</span>}
                </motion.div>

                {/* Label */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                  className={`mt-2 text-xs font-medium ${
                    isCompleted ? 'text-emerald-700' : isCurrent ? 'text-blue-700' : 'text-slate-500'
                  }`}
                >
                  {stage.label}
                </motion.p>

                {/* Count badge */}
                {stage.count !== undefined && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.5, type: 'spring' }}
                    className={`mt-1 text-xs font-bold px-1.5 py-0.5 rounded ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-700'
                        : isCurrent
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {stage.count}
                  </motion.span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Mini timeline for project detail pages
export function MiniWorkflowTimeline({ stages, className = '' }: { stages: StageNode[]; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {stages.map((stage, i) => (
        <div key={stage.code} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              stage.status === 'completed'
                ? 'bg-emerald-500 text-white'
                : stage.status === 'current'
                  ? 'bg-blue-500 text-white ring-2 ring-blue-200 ring-offset-2'
                  : 'bg-slate-200 text-slate-400'
            }`}
          >
            {stage.status === 'completed' ? '✓' : i + 1}
          </div>
          {i < stages.length - 1 && (
            <div className={`w-8 h-0.5 rounded ${stage.status === 'completed' ? 'bg-emerald-400' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
