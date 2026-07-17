/**
 * MITRA AI Workspace — Component Index
 *
 * Import any AI workspace component from this barrel:
 *
 *   import { AICommandBar, AIActionCenter, useAIWorkspace } from '../components/AI';
 *
 * Wire them to state via <AIWorkspaceProvider> and useAIWorkspace().
 */

// ── Core overlays (mounted by AIWorkspace shell) ─────────────────────────────
export { AICommandBar } from './AICommandBar';
export type { AICommandBarProps } from './AICommandBar';

export { AIExecutionPreview } from './AIExecutionPreview';
export type { AIExecutionPreviewProps } from './AIExecutionPreview';

// ── Workspace shell ──────────────────────────────────────────────────────────
export { AIWorkspace } from './AIWorkspace';

// ── Action queue ─────────────────────────────────────────────────────────────
export { AIActionCenter } from './AIActionCenter';
export type { AIActionCenterProps } from './AIActionCenter';

// ── Existing dock (unchanged) ────────────────────────────────────────────────
export { AIDock } from './AIDock';

// ── Workspace types ───────────────────────────────────────────────────────────
export type {
  AIAction,
  ActionStatus,
  AIRecommendation,
  PredictiveInsight,
  AISystemStatus,
  AIConnectionStatus,
  ConversationSummary,
  AIModuleContext,
  AIContextItem,
  Command,
  CommandCategory,
  QuickAction,
  ExecutionPreviewData,
  PriorityLevel,
  RiskLevel,
  TrendDirection,
} from './workspace/ai.workspace.types';
