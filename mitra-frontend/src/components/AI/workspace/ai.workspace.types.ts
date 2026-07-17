/**
 * AI Workspace shared types
 *
 * Used by AIWorkspaceContext, AICommandBar, AIActionCenter,
 * AIExecutionPreview and any future AI workspace widgets.
 */

export type CommandCategory =
  | 'analysis'
  | 'production'
  | 'quality'
  | 'planning'
  | 'navigation'
  | 'action';

export interface Command {
  id: string;
  label: string;
  description?: string;
  category: CommandCategory;
  icon?: string;
  shortcut?: string;
  /** Natural-language prompt sent to the AI when selected */
  prompt?: string;
  /** Direct callback for navigation/settings commands */
  action?: () => void;
  disabled?: boolean;
}

export type ActionStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled';

export interface AIAction {
  id: string;
  title: string;
  description: string;
  targetModule: string;
  status: ActionStatus;
  affectedEntities?: string[];
  error?: string;
  triggeredAt?: string;
  completedAt?: string;
  // Added for AI command integration
  commandId?: string;
  metadata?: Record<string, any>;
  result?: string;
}

export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel = 'low' | 'medium' | 'high' | 'severe';
export type TrendDirection = 'up' | 'down' | 'stable';

export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  module: string;
  priority: PriorityLevel;
  impact: string;
  confidence: number;
}

export interface PredictiveInsight {
  id: string;
  metric: string;
  currentValue: number;
  predictedValue: number;
  trend: TrendDirection;
  risk: RiskLevel;
  timeframe: string;
}

export interface AISystemStatus {
  status: 'healthy' | 'degraded' | 'offline';
  latencyMs?: number;
  lastChecked: string;
  modelVersion?: string;
}

export interface AIConnectionStatus {
  connected: boolean;
  reconnecting?: boolean;
  error?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  timestamp: string;
  messageCount: number;
}

export interface AIContextItem {
  id: string;
  type: 'document' | 'module' | 'alert' | 'metric';
  label: string;
  value: string;
}

export interface AIModuleContext {
  module: string;
  route: string;
  contextItems: AIContextItem[];
}

export interface QuickAction {
  id: string;
  label: string;
  icon?: string;
  prompt: string;
}

export interface ExecutionPreviewData {
  action: AIAction;
  estimatedImpact: string;
  affectedRecords: string[];
  requiresConfirmation: boolean;
}
