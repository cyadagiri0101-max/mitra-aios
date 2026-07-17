/**
 * AIExecutionPreview
 *
 * Confirmation modal shown before an AI-recommended action is executed.
 * Controlled by AIWorkspaceContext.
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  X,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import type { AIAction } from './workspace/ai.workspace.types';

export interface AIExecutionPreviewProps {
  action: AIAction | null;
  isOpen: boolean;
  isExecuting: boolean;
  onConfirm: (id: string) => void;
  onCancel: () => void;
}

export function AIExecutionPreview({
  action,
  isOpen,
  isExecuting,
  onConfirm,
  onCancel,
}: AIExecutionPreviewProps) {
  if (!action) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[70]"
            style={{ background: 'rgba(2,6,18,0.72)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            aria-hidden="true"
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="execution-preview-title"
              className="w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
              style={{
                background: 'linear-gradient(160deg, rgba(17,34,64,0.98) 0%, rgba(6,15,31,0.99) 100%)',
                border: '1px solid rgba(73,86,112,0.6)',
              }}
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between border-b px-5 py-4"
                style={{ borderColor: 'rgba(73,86,112,0.4)' }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(243,156,18,0.12)' }}
                  >
                    <AlertTriangle className="h-4 w-4" style={{ color: '#F39C12' }} aria-hidden="true" />
                  </div>
                  <h3
                    id="execution-preview-title"
                    className="text-sm font-semibold"
                    style={{ color: '#E6F1FF' }}
                  >
                    Confirm action
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isExecuting}
                  className="rounded-md p-1 transition-colors disabled:opacity-50"
                  style={{ color: '#8892B0' }}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-4">
                <h4 className="text-sm font-medium" style={{ color: '#E6F1FF' }}>
                  {action.title}
                </h4>
                <p className="mt-1 text-xs leading-5" style={{ color: '#8892B0' }}>
                  {action.description}
                </p>

                <div
                  className="mt-3 rounded-lg border px-3 py-2"
                  style={{
                    background: 'rgba(10,25,47,0.6)',
                    borderColor: 'rgba(73,86,112,0.35)',
                  }}
                >
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: '#495670' }}>
                    Target module
                  </p>
                  <p className="mt-0.5 font-mono text-xs" style={{ color: '#64FFDA' }}>
                    {action.targetModule}
                  </p>
                </div>

                {action.affectedEntities && action.affectedEntities.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: '#495670' }}>
                      Affected records
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {action.affectedEntities.map((e) => (
                        <span
                          key={e}
                          className="rounded px-1.5 py-0.5 font-mono text-[9px]"
                          style={{ background: 'rgba(0,180,216,0.08)', color: '#00B4D8' }}
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-end gap-2 border-t px-5 py-4"
                style={{ borderColor: 'rgba(73,86,112,0.3)' }}
              >
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isExecuting}
                  className="rounded-lg px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ color: '#8892B0' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onConfirm(action.id)}
                  disabled={isExecuting}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-70"
                  style={{
                    background: 'rgba(100,255,218,0.12)',
                    border: '1px solid rgba(100,255,218,0.3)',
                    color: '#64FFDA',
                  }}
                >
                  {isExecuting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {isExecuting ? 'Executing…' : 'Confirm & run'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
