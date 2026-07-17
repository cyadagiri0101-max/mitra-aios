/**
 * AI Response Types and DTOs
 * 
 * Defines the response structures for all 10 AI commands.
 * Used by aiCommandService.ts and AIWorkspaceContext.tsx
 * 
 * File: mitra-frontend/src/types/aiResponses.ts
 * Author: AI Assistant
 * Date: 2026-06-27
 */

// ============================================================================
// 1. BOM Risk Analysis Response
// ============================================================================

export interface BomRiskReport {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  complexityScore: number; // 0-10
  riskAreas: Array<{
    part: string;
    risk: string;
    recommendation: string;
  }>;
  summary: string;
}

// ============================================================================
// 2. Drawing Review Response
// ============================================================================

export interface DrawingReviewReport {
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  machiningTimeHours: number;
  toleranceRisks: Array<{
    type: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  releaseApproved: boolean;
  summary: string;
}

// ============================================================================
// 3. Delay Risk Analysis Response
// ============================================================================

export interface DelayRiskAnalysis {
  topBlockers: Array<{
    projectId: string;
    projectName: string;
    risk: string;
    daysBehind: number;
    currentStage: string;
    targetDate: string;
  }>;
  totalActiveProjects: number;
  projectsAtRisk: number;
  summary: string;
  aiAnalysis?: string;
}

// ============================================================================
// 4. Root Cause Analysis Response
// ============================================================================

export interface RootCauseAnalysis {
  entityType: string; // 'capa', 'trial', etc.
  entityId: string;
  findings: Array<{
    cause: string;
    evidence: string;
    likelihood: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  summary: string;
  detailedAnalysis: string;
}

// ============================================================================
// 5. Recommendations Report Response
// ============================================================================

export interface RecommendationReport {
  recommendations: Array<{
    action: string;
    priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
    impact: string;
  }>;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM';
  summary: string;
  generatedAt: string;
}

// ============================================================================
// 6. Quality Trend Report Response
// ============================================================================

export interface QualityTrendReport {
  overallTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  defectCategories: Array<{
    category: string;
    count: number;
    trend: string;
  }>;
  risingCategories: Array<{
    category: string;
    count: number;
    trend: string;
  }>;
  summary: string;
  analysisDetails: string;
}

// ============================================================================
// 7. Dispatch Risk Report Response
// ============================================================================

export interface DispatchRiskReport {
  totalDispatchOrders: number;
  ordersAtRisk: number;
  riskyOrders: Array<{
    dispatchNumber: string;
    customer: string;
    plannedDate: string;
    status: string;
    daysOverdue: number;
  }>;
  summary: string;
  aiAnalysis?: string;
}

// ============================================================================
// 8. Production Alert Summary Response
// ============================================================================

export interface ProductionAlertSummary {
  totalAlerts: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  machinesInAlarm: number;
  alerts: Array<{
    alarmCode: string;
    machineId: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    count: number;
  }>;
  summary: string;
}

// ============================================================================
// 9. Maintenance Forecast Response
// ============================================================================

export interface MaintenanceForecast {
  machinesRequiringMaintenance: number;
  forecast: Array<{
    machineId: string;
    status: string;
    utilizationPercent: number;
    runtimeToday: number;
    alarm: string;
    recommendedAction: string;
  }>;
  summary: string;
  aiForecasting?: string;
}

// ============================================================================
// 10. Production Plan Conflict Analysis Response
// ============================================================================

export interface PlanConflictAnalysis {
  planId: string;
  projectId: string;
  status: string;
  estimatedHours: number;
  conflicts: Array<{
    type: string;
    description: string;
    affectedItems: number;
  }>;
  gaps: Array<{
    type: string;
    description: string;
    impact: string;
  }>;
  summary: string;
  detailedAnalysis: string;
}

// ============================================================================
// Backend AI Chat Response (used by multiple commands)
// ============================================================================

export interface AiChatResponse {
  answer: string; // LLM-generated analysis
  intent: string; // Detected intent (PROJECTS, TRIALS, CAPA, etc.)
  context: Record<string, any>; // DB records used as context
  modelUsed: string; // e.g., "phi3"
  processingMs: number; // Time to fetch context + call Ollama
  aiEnabled: boolean; // Whether AI is enabled
}

// ============================================================================
// Union type for any AI command response
// ============================================================================

export type AiCommandResponse =
  | BomRiskReport
  | DrawingReviewReport
  | DelayRiskAnalysis
  | RootCauseAnalysis
  | RecommendationReport
  | QualityTrendReport
  | DispatchRiskReport
  | ProductionAlertSummary
  | MaintenanceForecast
  | PlanConflictAnalysis;

// ============================================================================
// Result wrapper for action execution in AIWorkspaceContext
// ============================================================================

export interface ActionResult {
  commandId: string;
  status: 'success' | 'failed';
  result?: AiCommandResponse;
  error?: {
    message: string;
    code?: string;
    timestamp: string;
  };
  executionTimeMs: number;
}
