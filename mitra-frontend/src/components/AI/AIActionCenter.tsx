/**
 * AIActionCenter
 *
 * Tracks the lifecycle of AI-recommended actions: pending → running →
 * success / failed / cancelled. Shows a real-time queue with progress
 * indicators, status badges, undo capability, and an audit log.
 *
 * Integration:
 * - Wire `actions` from your AIAction store/queue
 * - `onExecute(id)` → triggers the action runner
 * - `onCancel(id)` → cancels pending action
 * - `onPreview(action)` → opens AIExecutionPreview
 *
 * Accessibility:
 * - Status changes announced via aria-live="assertive" for critical updates
 * - Each action card has role="article"
 * - Progress bar has role="progressbar"
 *
 * Animation:
 * - New items: slide in from top
 * - Status transition: smooth color fade
 * - Success: green flash then settle
 * - Failed: red flash
 * - Remove completed: height collapse exit
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Zap,
  Eye,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';
import type { AIAction, ActionStatus } from './workspace/ai.workspace.types';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AIActionCenterProps {
  actions: AIAction[];
  onExecute: (id: string) => void;
  onCancel: (id: string) => void;
  onPreview: (action: AIAction) => void;
  onRetry?: (id: string) => void;
  onClearCompleted?: () => void;
  className?: string;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ActionStatus, {
  label: string;
  color: string;
  bg: string;
  Icon: React.ElementType;
  pulse?: boolean;
}> = {
  pending:   { label: 'Pending',   color: '#8892B0', bg: 'rgba(136,146,176,0.1)', Icon: Clock,       pulse: false },
  running:   { label: 'Running',   color: '#00B4D8', bg: 'rgba(0,180,216,0.1)',   Icon: Loader2,     pulse: true  },
  success:   { label: 'Done',      color: '#2ECC71', bg: 'rgba(46,204,113,0.1)',  Icon: CheckCircle, pulse: false },
  failed:    { label: 'Failed',    color: '#E74C3C', bg: 'rgba(231,76,60,0.1)',   Icon: XCircle,     pulse: false },
  cancelled: { label: 'Cancelled', color: '#495670', bg: 'rgba(73,86,112,0.1)',   Icon: X,           pulse: false },
};

// ─── ActionCard ───────────────────────────────────────────────────────────────

interface ActionCardProps {
  action: AIAction;
  onExecute: () => void;
  onCancel: () => void;
  onPreview: () => void;
  onRetry?: () => void;
  index: number;
}

function ActionCard({ action, onExecute, onCancel, onPreview, onRetry, index }: ActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[action.status];
  const StatusIcon = cfg.Icon;
  // isTerminal check available: action.status === 'success' || action.status === 'cancelled'
  const isFailed = action.status === 'failed';

  return (
    <motion.article
      className="overflow-hidden rounded-xl"
      style={{
        background: 'rgba(17,34,64,0.65)',
        border: `1px solid ${
          action.status === 'running' ? 'rgba(0,180,216,0.3)' :
          action.status === 'success' ? 'rgba(46,204,113,0.25)' :
          action.status === 'failed'  ? 'rgba(231,76,60,0.25)' :
          'rgba(73,86,112,0.4)'
        }`,
      }}
      initial={{ opacity: 0, y: -8, height: 'auto' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      layout
    >
      <div className="p-3">
        {/* Top row */}
        <div className="flex items-start gap-2.5">
          {/* Status icon */}
          <div
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
            style={{ background: cfg.bg }}
            aria-hidden="true"
          >
            <StatusIcon
              className={`h-3.5 w-3.5 ${action.status === 'running' ? 'animate-spin' : ''}`}
              style={{ color: cfg.color }}
            />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-xs font-semibold leading-4" style={{ color: '#E6F1FF' }}>
                {action.title}
              </h4>

              {/* Status badge */}
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                style={{ background: cfg.bg, color: cfg.color }}
                role="status"
                aria-label={`Status: ${cfg.label}`}
              >
                {cfg.label}
              </span>
            </div>

            {/* Module */}
            <p className="mt-0.5 font-mono text-[10px]" style={{ color: '#495670' }}>
              {action.targetModule}
            </p>
          </div>
        </div>

        {/* Running progress bar */}
        {action.status === 'running' && (
          <div
            className="relative mt-2 h-0.5 overflow-hidden rounded-full"
            style={{ background: 'rgba(73,86,112,0.3)' }}
            role="progressbar"
            aria-label="Execution in progress"
            aria-valuetext="Running"
          >
            <motion.div
              className="absolute inset-y-0 left-0"
              style={{
                background: 'linear-gradient(90deg, transparent, #00B4D8, transparent)',
                width: '40%',
              }}
              animate={{ x: ['-100%', '300%'] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            />
          </div>
        )}

        {/* Error message */}
        {isFailed && action.error && (
          <p className="mt-2 rounded-md px-2.5 py-1.5 text-[10px] leading-4" style={{
            background: 'rgba(231,76,60,0.08)',
            border: '1px solid rgba(231,76,60,0.2)',
            color: '#E74C3C',
          }}>
            {action.error}
          </p>
        )}

        {/* Expandable description */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <p className="mt-2 text-[10px] leading-4" style={{ color: '#8892B0' }}>
                {action.description}
              </p>
              {action.affectedEntities && action.affectedEntities.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
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
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions row */}
        <div className="mt-2.5 flex items-center gap-1.5">
          {/* Expand toggle */}
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-1 text-[10px] transition-colors"
            style={{ color: '#495670' }}
            aria-expanded={expanded}
          >
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.18 }}
              aria-hidden="true"
            >
              <ChevronDown className="h-3 w-3" />
            </motion.span>
          </button>

          <div className="flex items-center gap-1.5 ml-auto">
            {/* Preview */}
            <button
              type="button"
              onClick={onPreview}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors"
              style={{
                background: 'rgba(73,86,112,0.2)',
                border: '1px solid rgba(73,86,112,0.35)',
                color: '#8892B0',
              }}
              aria-label={`Preview action: ${action.title}`}
            >
              <Eye className="h-2.5 w-2.5" aria-hidden="true" />
              Preview
            </button>

            {/* Retry (failed) */}
            {isFailed && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors"
                style={{
                  background: 'rgba(243,156,18,0.1)',
                  border: '1px solid rgba(243,156,18,0.3)',
                  color: '#F39C12',
                }}
                aria-label={`Retry: ${action.title}`}
              >
                <RotateCcw className="h-2.5 w-2.5" aria-hidden="true" />
                Retry
              </button>
            )}

            {/* Cancel (pending) */}
            {action.status === 'pending' && (
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors"
                style={{
                  background: 'rgba(231,76,60,0.08)',
                  border: '1px solid rgba(231,76,60,0.2)',
                  color: '#E74C3C',
                }}
                aria-label={`Cancel: ${action.title}`}
              >
                <X className="h-2.5 w-2.5" aria-hidden="true" />
              </button>
            )}

            {/* Execute (pending) */}
            {action.status === 'pending' && (
              <motion.button
                type="button"
                onClick={onExecute}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-all"
                style={{
                  background: 'rgba(100,255,218,0.1)',
                  border: '1px solid rgba(100,255,218,0.3)',
                  color: '#64FFDA',
                }}
                whileHover={{ background: 'rgba(100,255,218,0.18)' }}
                whileTap={{ scale: 0.96 }}
                aria-label={`Run: ${action.title}`}
              >
                <Play className="h-2.5 w-2.5" aria-hidden="true" />
                Run
              </motion.button>
            )}
          </div>
        </div>

        {/* Timestamps */}
        {(action.triggeredAt || action.completedAt) && (
          <p className="mt-1.5 text-[9px]" style={{ color: '#233554' }}>
            {action.triggeredAt && (
              <>Started {new Date(action.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
            )}
            {action.completedAt && (
              <> · Done {new Date(action.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
            )}
          </p>
        )}
      </div>
    </motion.article>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AIActionCenter({
  actions,
  onExecute,
  onCancel,
  onPreview,
  onRetry,
  onClearCompleted,
  className = '',
}: AIActionCenterProps) {
  const pending   = actions.filter((a) => a.status === 'pending');
  const running   = actions.filter((a) => a.status === 'running');
  const completed = actions.filter((a) => a.status === 'success' || a.status === 'failed' || a.status === 'cancelled');

  const hasCompleted = completed.length > 0;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5" style={{ color: '#64FFDA' }} aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#8892B0' }}>
            Action Center
          </span>
        </div>
        <div className="flex items-center gap-2">
          {running.length > 0 && (
            <span
              className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: 'rgba(0,180,216,0.12)', color: '#00B4D8' }}
              role="status"
              aria-live="assertive"
            >
              {running.length} running
            </span>
          )}
          {pending.length > 0 && (
            <span
              className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: 'rgba(136,146,176,0.12)', color: '#8892B0' }}
            >
              {pending.length} queued
            </span>
          )}
        </div>
      </div>

      {/* Empty state */}
      {actions.length === 0 && (
        <div
          className="flex flex-col items-center justify-center rounded-xl py-8 text-center"
          style={{ border: '1px dashed rgba(73,86,112,0.3)' }}
          role="status"
        >
          <Zap className="mb-2 h-5 w-5 opacity-20" style={{ color: '#8892B0' }} aria-hidden="true" />
          <p className="text-xs" style={{ color: '#495670' }}>No queued actions</p>
          <p className="mt-0.5 text-[10px]" style={{ color: '#233554' }}>
            Execute a recommendation to start
          </p>
        </div>
      )}

      {/* Running */}
      <AnimatePresence>
        {running.map((action, i) => (
          <ActionCard
            key={action.id}
            action={action}
            onExecute={() => onExecute(action.id)}
            onCancel={() => onCancel(action.id)}
            onPreview={() => onPreview(action)}
            onRetry={onRetry ? () => onRetry(action.id) : undefined}
            index={i}
          />
        ))}
      </AnimatePresence>

      {/* Pending */}
      {pending.length > 0 && (
        <>
          {running.length > 0 && (
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#495670' }}>
              Queued
            </p>
          )}
          <AnimatePresence>
            {pending.map((action, i) => (
              <ActionCard
                key={action.id}
                action={action}
                onExecute={() => onExecute(action.id)}
                onCancel={() => onCancel(action.id)}
                onPreview={() => onPreview(action)}
                onRetry={onRetry ? () => onRetry(action.id) : undefined}
                index={i}
              />
            ))}
          </AnimatePresence>
        </>
      )}

      {/* Completed */}
      {hasCompleted && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#495670' }}>
              Completed
            </p>
            {onClearCompleted && (
              <button
                type="button"
                onClick={onClearCompleted}
                className="text-[10px] transition-colors"
                style={{ color: '#495670' }}
                aria-label="Clear completed actions"
              >
                Clear all
              </button>
            )}
          </div>
          <AnimatePresence>
            {completed.map((action, i) => (
              <ActionCard
                key={action.id}
                action={action}
                onExecute={() => onExecute(action.id)}
                onCancel={() => onCancel(action.id)}
                onPreview={() => onPreview(action)}
                onRetry={onRetry ? () => onRetry(action.id) : undefined}
                index={i}
              />
            ))}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
