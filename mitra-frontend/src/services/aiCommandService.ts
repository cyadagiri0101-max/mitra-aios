/**
 * AICommandService
 * 
 * Specialized service that routes AI commands from AIWorkspace to live backend endpoints.
 * Replaces mock implementations (setTimeout) with real API calls.
 * 
 * File: mitra-frontend/src/services/aiCommandService.ts
 * Author: AI Assistant
 * Date: 2026-06-27
 */

import { api } from '../utils/api';
import {
  BomRiskReport,
  DrawingReviewReport,
  DelayRiskAnalysis,
  RootCauseAnalysis,
  RecommendationReport,
  QualityTrendReport,
  DispatchRiskReport,
  ProductionAlertSummary,
  MaintenanceForecast,
  PlanConflictAnalysis,
} from '@/types/aiResponses';

// Constants
const COMMAND_TIMEOUTS = {
  'bom-risk': { min: 500, max: 5000 },
  'drawing': { min: 1000, max: 8000 },
  'delay-risk': { min: 1000, max: 10000 },
  'root-cause': { min: 2000, max: 15000 },
  'recommend': { min: 2000, max: 15000 },
  'quality': { min: 1500, max: 12000 },
  'dispatch': { min: 1000, max: 8000 },
  'alerts': { min: 500, max: 5000 },
  'maintenance': { min: 1500, max: 10000 },
  'planning': { min: 2000, max: 12000 },
} as const;

class AICommandService {
  /**
   * Execute a command and return result
   * Routes to appropriate backend endpoint based on command ID
   */
  async execute(commandId: string, context?: any): Promise<any> {
    const timeoutMs = COMMAND_TIMEOUTS[commandId as keyof typeof COMMAND_TIMEOUTS]?.max || 10000;
    
    try {
      const result = await Promise.race([
        this.executeCommand(commandId, context),
        this.timeout(timeoutMs),
      ]);
      return result;
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw new Error(`Command "${commandId}" exceeded ${timeoutMs}ms timeout`);
      }
      throw error;
    }
  }

  /**
   * Route to specific command handler
   */
  private executeCommand(commandId: string, context?: any): Promise<any> {
    switch (commandId) {
      case 'bom-risk':
        return this.analyzeBomRisk(context?.projectId);
      case 'drawing':
        return this.reviewDrawing(context?.projectId, context?.fileBase64);
      case 'delay-risk':
        return this.predictDelayRisks();
      case 'root-cause':
        return this.findRootCauses(context?.entityType, context?.entityId);
      case 'recommend':
        return this.getRecommendations();
      case 'quality':
        return this.analyzeQualityTrends();
      case 'dispatch':
        return this.checkDispatchRisks();
      case 'alerts':
        return this.summarizeAlerts();
      case 'maintenance':
        return this.forecastMaintenance();
      case 'planning':
        return this.reviewProductionPlan(context?.planId);
      default:
        throw new Error(`Unknown command: ${commandId}`);
    }
  }

  /**
   * 1. BOM Risk Analysis
   * Analyzes BOM for material, lead-time, and alternate-part risks
   * Endpoint: POST /api/bom-analysis/analyze
   */
  async analyzeBomRisk(projectId?: string): Promise<BomRiskReport> {
    try {
      // If projectId provided, fetch project's BOM first
      if (projectId) {
        const projectResponse = await api.get(`/project/${projectId}`);
        const project = projectResponse.data;

        // Prepare BOM data from project (assuming BOM is stored in project entity)
        const bomData = project.bomData || {
          parts: [],
          materials: [],
          vendors: [],
        };

        const response = await api.post('/bom-analysis/analyze', {
          projectId,
          bomData,
        });

        return {
          riskLevel: this.calculateRiskLevel(response.data.complexityScore, response.data.riskAreas?.length || 0),
          complexityScore: response.data.complexityScore,
          riskAreas: (response.data.riskAreas || []).map((area: any) => ({
            part: area.partNo || area.part || 'Unknown',
            risk: area.issue || area.risk || 'Unspecified risk',
            recommendation: area.suggestion || area.recommendation || 'Review with engineering',
          })),
          summary: `BOM analysis for ${project.projectNumber}: ${response.data.riskAreas?.length || 0} risk areas identified. Complexity score: ${response.data.complexityScore}/10.`,
        };
      } else {
        // Fallback: analyze latest BOM without projectId
        const response = await api.post('/bom-analysis/analyze', {
          projectId: 'latest',
          bomData: {},
        });

        return {
          riskLevel: this.calculateRiskLevel(response.data.complexityScore, 0),
          complexityScore: response.data.complexityScore,
          riskAreas: [],
          summary: 'BOM analysis complete.',
        };
      }
    } catch (error) {
      console.error('BOM Risk Analysis Error:', error);
      throw this.handleApiError(error, 'bom-risk');
    }
  }

  /**
   * 2. Drawing Analysis
   * Reviews drawing for manufacturability, tolerance, and release risks
   * Endpoint: POST /api/drawing-analysis/upload
   */
  async reviewDrawing(projectId?: string, fileBase64?: string): Promise<DrawingReviewReport> {
    try {
      if (!projectId) {
        throw new Error('Project ID required for drawing analysis');
      }

      // If file provided, upload it; otherwise fetch latest drawing
      if (fileBase64) {
        const response = await api.post('/drawing-analysis/upload', {
          projectId,
          fileContentBase64: fileBase64,
          fileType: this.detectFileType(fileBase64),
        });

        return {
          complexity: response.data.partComplexity || 'MEDIUM',
          machiningTimeHours: response.data.suggestedMachiningTime || 0,
          toleranceRisks: (response.data.riskAreas || []).map((area: any) => ({
            type: area.type || 'Tolerance',
            description: area.area || 'Unspecified',
            severity: this.calculateSeverity(area.type),
          })),
          releaseApproved: (response.data.riskAreas || []).length === 0,
          summary: `Drawing review: ${response.data.partComplexity || 'Unknown'} complexity. Estimated machining time: ${response.data.suggestedMachiningTime || 0}h. ${response.data.riskAreas?.length || 0} risk areas.`,
        };
      } else {
        // Fetch latest drawing for project
        const response = await api.get(`/drawing-analysis/project/${projectId}`);
        if (!response.data || response.data.length === 0) {
          throw new Error('No drawing found for this project');
        }

        const latest = response.data[0];
        return {
          complexity: latest.partComplexity || 'MEDIUM',
          machiningTimeHours: latest.suggestedMachiningTime || 0,
          toleranceRisks: (latest.riskAreas || []).map((area: any) => ({
            type: area.type || 'Tolerance',
            description: area.area || 'Unspecified',
            severity: 'MEDIUM',
          })),
          releaseApproved: (latest.riskAreas || []).length === 0,
          summary: `Latest drawing review: ${latest.partComplexity} complexity.`,
        };
      }
    } catch (error) {
      console.error('Drawing Review Error:', error);
      throw this.handleApiError(error, 'drawing');
    }
  }

  /**
   * 3. Delay Risk Prediction
   * Predicts delay risks across active projects and ranks top blockers
   * Endpoint: POST /api/ai/chat (intent: PROJECTS)
   */
  async predictDelayRisks(): Promise<DelayRiskAnalysis> {
    try {
      const response = await api.post('/ai/chat', {
        message: 'Predict delay risks across all active projects and rank the top blockers.',
        intent: 'PROJECTS',
      });

      // Extract project data from context
      const projects = response.data.context?.projects || [];
      const topBlockers = projects
        .filter((p: any) => p.daysOverdue && p.daysOverdue > 0)
        .sort((a: any, b: any) => (b.daysOverdue || 0) - (a.daysOverdue || 0))
        .slice(0, 5)
        .map((p: any) => ({
          projectId: p.id || p.projectNumber,
          projectName: p.name || p.projectNumber,
          risk: `${p.daysOverdue || 0} days behind schedule`,
          daysBehind: p.daysOverdue || 0,
          currentStage: p.currentStage,
          targetDate: p.targetDeliveryDate,
        }));

      return {
        topBlockers,
        totalActiveProjects: projects.length,
        projectsAtRisk: topBlockers.length,
        summary: response.data.answer || 'Delay risk analysis complete.',
        aiAnalysis: response.data.answer,
      };
    } catch (error) {
      console.error('Delay Risk Prediction Error:', error);
      throw this.handleApiError(error, 'delay-risk');
    }
  }

  /**
   * 4. Root Cause Analysis
   * Finds likely root causes for production and quality exceptions
   * Endpoint: POST /api/ai/analyze (entityType: capa, question: RCA)
   */
  async findRootCauses(entityType?: string, entityId?: string): Promise<RootCauseAnalysis> {
    try {
      // If entity provided, use /ai/analyze; otherwise use /ai/chat with CAPA intent
      if (entityType && entityId) {
        const response = await api.post('/ai/analyze', {
          entityType: entityType || 'capa',
          entityId,
          question: 'What are the likely root causes of this issue?',
        });

        return {
          entityType: entityType || 'unknown',
          entityId,
          findings: [
            {
              cause: 'Primary root cause identified',
              evidence: response.data.context?.[entityType]?.issueDescription || 'See detailed analysis',
              likelihood: 'HIGH',
            },
          ],
          summary: response.data.answer || 'Root cause analysis complete.',
          detailedAnalysis: response.data.answer,
        };
      } else {
        // Fallback: use chat with CAPA intent
        const response = await api.post('/ai/chat', {
          message: 'Find likely root causes for current production and quality exceptions.',
          intent: 'CAPA',
        });

        return {
          entityType: 'multiple',
          entityId: 'N/A',
          findings: [],
          summary: response.data.answer || 'Root cause analysis complete.',
          detailedAnalysis: response.data.answer,
        };
      }
    } catch (error) {
      console.error('Root Cause Analysis Error:', error);
      throw this.handleApiError(error, 'root-cause');
    }
  }

  /**
   * 5. Get Recommendations
   * Recommends next best actions to keep projects on track
   * Endpoint: POST /api/ai/chat (intent: PROJECTS, with context)
   */
  async getRecommendations(): Promise<RecommendationReport> {
    try {
      const response = await api.post('/ai/chat', {
        message: 'Recommend the next best actions to keep all active projects on track today.',
        intent: 'PROJECTS',
      });

      // Parse LLM response into actionable recommendations
      const recommendations = this.parseRecommendations(response.data.answer);

      return {
        recommendations,
        priority: 'HIGH',
        summary: response.data.answer || 'Recommendations provided.',
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Recommendations Error:', error);
      throw this.handleApiError(error, 'recommend');
    }
  }

  /**
   * 6. Analyze Quality Trends
   * Summarizes current quality trends and flags rising defect categories
   * Endpoint: POST /api/ai/chat (intent: TRIALS or CAPA)
   */
  async analyzeQualityTrends(): Promise<QualityTrendReport> {
    try {
      const response = await api.post('/ai/chat', {
        message: 'Summarize current quality trends and flag any rising defect categories.',
        intent: 'TRIALS',
      });

      const trialData = response.data.context?.trialObservations || [];
      const defectCategories = this.categorizeDefects(trialData);

      return {
        overallTrend: this.calculateTrend(trialData),
        defectCategories: defectCategories.slice(0, 5),
        risingCategories: defectCategories.filter((d: any) => d.trend === 'RISING').slice(0, 3),
        summary: response.data.answer || 'Quality trend analysis complete.',
        analysisDetails: response.data.answer,
      };
    } catch (error) {
      console.error('Quality Trends Error:', error);
      throw this.handleApiError(error, 'quality');
    }
  }

  /**
   * 7. Check Dispatch Risks
   * Reviews pending dispatch orders and flags those at risk of missing schedule
   * Endpoint: GET /api/dispatch + POST /ai/chat for analysis
   */
  async checkDispatchRisks(): Promise<DispatchRiskReport> {
    try {
      // Fetch all active dispatch orders
      const dispatchResponse = await api.get('/dispatch?status=PLANNING,PACKED,SHIPPED');
      const dispatchOrders = dispatchResponse.data || [];

      // Use AI to analyze risks
      const aiResponse = await api.post('/ai/chat', {
        message: 'Review pending dispatch orders and flag any at risk of missing schedule.',
        intent: 'DISPATCH',
      });

      // Identify at-risk orders (late shipments or no shipment date)
      const atRiskOrders = dispatchOrders
        .filter((order: any) => {
          const plannedDate = new Date(order.plannedDate);
          const today = new Date();
          return plannedDate < today || !order.shippedDate;
        })
        .map((order: any) => ({
          dispatchNumber: order.dispatchNumber,
          customer: order.customerName,
          plannedDate: order.plannedDate,
          status: order.status,
          daysOverdue: Math.floor(
            (new Date().getTime() - new Date(order.plannedDate).getTime()) / (1000 * 60 * 60 * 24)
          ),
        }));

      return {
        totalDispatchOrders: dispatchOrders.length,
        ordersAtRisk: atRiskOrders.length,
        riskyOrders: atRiskOrders.slice(0, 5),
        summary: `${atRiskOrders.length} of ${dispatchOrders.length} dispatch orders at risk.`,
        aiAnalysis: aiResponse.data.answer,
      };
    } catch (error) {
      console.error('Dispatch Risk Error:', error);
      throw this.handleApiError(error, 'dispatch');
    }
  }

  /**
   * 8. Summarize Alerts
   * Summarizes all active production alerts by severity
   * Endpoint: GET /api/machine-status/summary/dashboard
   */
  async summarizeAlerts(): Promise<ProductionAlertSummary> {
    try {
      const response = await api.get('/machine-status/summary/dashboard');
      const data = response.data;

      // Group alerts by severity
      const alertsBySeverity = {
        CRITICAL: (data.alarmSummary || []).filter((a: any) => a.severity === 'CRITICAL'),
        HIGH: (data.alarmSummary || []).filter((a: any) => a.severity === 'HIGH'),
        MEDIUM: (data.alarmSummary || []).filter((a: any) => a.severity === 'MEDIUM'),
        LOW: (data.alarmSummary || []).filter((a: any) => a.severity === 'LOW'),
      };

      return {
        totalAlerts: data.alarmSummary?.length || 0,
        criticalCount: alertsBySeverity.CRITICAL.length,
        highCount: alertsBySeverity.HIGH.length,
        mediumCount: alertsBySeverity.MEDIUM.length,
        lowCount: alertsBySeverity.LOW.length,
        machinesInAlarm: data.machinesInAlarm || 0,
        alerts: (data.alarmSummary || [])
          .sort((a: any, b: any) => {
            const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
            return (severityOrder[a.severity as keyof typeof severityOrder] || 99) -
              (severityOrder[b.severity as keyof typeof severityOrder] || 99);
          })
          .slice(0, 10)
          .map((alert: any) => ({
            alarmCode: alert.alarmCode,
            machineId: alert.machineId,
            severity: alert.severity,
            count: alert.count,
          })),
        summary: `${data.machinesInAlarm || 0} machines in alarm state. ${alertsBySeverity.CRITICAL.length} critical alerts.`,
      };
    } catch (error) {
      console.error('Alerts Summary Error:', error);
      throw this.handleApiError(error, 'alerts');
    }
  }

  /**
   * 9. Forecast Maintenance
   * Forecasts upcoming maintenance needs based on machine utilization
   * Endpoint: GET /api/machine-status + POST /ai/chat (MANUFACTURING intent)
   */
  async forecastMaintenance(): Promise<MaintenanceForecast> {
    try {
      // Fetch machine status data
      const machineResponse = await api.get('/machine-status');
      const machines = machineResponse.data || [];

      // Use AI to forecast maintenance
      const aiResponse = await api.post('/ai/chat', {
        message: 'Forecast upcoming maintenance needs based on current machine utilization.',
        intent: 'MANUFACTURING',
      });

      // Identify high-utilization machines (candidates for maintenance)
      const maintenanceCandidates = machines
        .filter((m: any) => m.utilizationPercent > 75 || m.alarmCode)
        .sort((a: any, b: any) => (b.utilizationPercent || 0) - (a.utilizationPercent || 0))
        .slice(0, 5)
        .map((m: any) => ({
          machineId: m.machineId,
          status: m.status,
          utilizationPercent: m.utilizationPercent,
          runtimeToday: m.totalRuntimeToday,
          alarm: m.alarmCode || 'None',
          recommendedAction: m.utilizationPercent > 85 ? 'Immediate maintenance' : 'Schedule within 48h',
        }));

      return {
        machinesRequiringMaintenance: maintenanceCandidates.length,
        forecast: maintenanceCandidates,
        summary: `${maintenanceCandidates.length} machines recommended for maintenance.`,
        aiForecasting: aiResponse.data.answer,
      };
    } catch (error) {
      console.error('Maintenance Forecast Error:', error);
      throw this.handleApiError(error, 'maintenance');
    }
  }

  /**
   * 10. Review Production Plan
   * Reviews production plan and identifies conflicts, gaps, or resource issues
   * Endpoint: GET /api/planning/process-plans/:id + AI analysis
   */
  async reviewProductionPlan(planId?: string): Promise<PlanConflictAnalysis> {
    try {
      let plan_id = planId;
      
      if (!plan_id) {
        // Fetch latest active plan if no planId provided
        const plansResponse = await api.get('/planning/process-plans?status=RELEASED,APPROVED');
        if (!plansResponse.data || plansResponse.data.length === 0) {
          throw new Error('No active production plans found');
        }
        plan_id = plansResponse.data[0].id;
      }

      // Fetch plan details
      const planResponse = await api.get(`/planning/process-plans/${plan_id}`);
      const plan = planResponse.data;

      // Query machine bookings for conflicts (if endpoint exists)
      let conflicts = [];
      try {
        const bookingResponse = await api.get('/machine/booking/conflicts');
        conflicts = bookingResponse.data || [];
      } catch {
        // Endpoint may not exist; continue without conflict data
      }

      // Use AI to analyze plan
      const aiResponse = await api.post('/ai/chat', {
        message: 'Review the current production plan and identify conflicts, gaps, or resource issues.',
        intent: 'MANUFACTURING',
      });

      return {
        planId: plan_id as string,
        projectId: (plan.projectId || 'unknown') as string,
        status: (plan.status || 'DRAFT') as string,
        estimatedHours: plan.totalEstimatedHours || 0,
        conflicts: conflicts.slice(0, 3).map((c: any) => ({
          type: 'Resource Conflict',
          description: c.description || 'Machine over-allocated',
          affectedItems: c.conflictingBookings?.length || 0,
        })),
        gaps: [],
        summary: (aiResponse.data.answer || 'Plan review complete.') as string,
        detailedAnalysis: (aiResponse.data.answer || 'No detailed analysis available.') as string,
      };
    } catch (error) {
      console.error('Production Plan Review Error:', error);
      throw this.handleApiError(error, 'planning');
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Promise that rejects after specified milliseconds
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new TimeoutError(`Operation timed out after ${ms}ms`)), ms)
    );
  }

  /**
   * Calculate risk level based on score and area count
   */
  private calculateRiskLevel(
    score: number,
    areaCount: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 8 || areaCount >= 5) return 'CRITICAL';
    if (score >= 6 || areaCount >= 3) return 'HIGH';
    if (score >= 4 || areaCount >= 1) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate severity based on risk type
   */
  private calculateSeverity(type: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const highRiskKeywords = ['critical', 'failure', 'safety'];
    const mediumRiskKeywords = ['tolerance', 'fit', 'surface'];
    if (highRiskKeywords.some((kw) => type.toLowerCase().includes(kw))) return 'HIGH';
    if (mediumRiskKeywords.some((kw) => type.toLowerCase().includes(kw))) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Detect file type from base64 content (simple heuristic)
   */
  private detectFileType(fileBase64: string): 'STEP' | 'IGES' | 'PDF' | 'DWG' {
    // Simple heuristic: check first bytes for file signature
    if (fileBase64.includes('ISO-10303')) return 'STEP';
    if (fileBase64.includes('IGES')) return 'IGES';
    if (fileBase64.startsWith('JVBERi')) return 'PDF'; // PDF magic number in base64
    if (fileBase64.includes('AC1')) return 'DWG';
    return 'STEP'; // Default fallback
  }

  /**
   * Parse LLM response into structured recommendations
   */
  private parseRecommendations(
    response: string
  ): Array<{ action: string; priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'; impact: string }> {
    // Simple parsing: split by numbered lines or bullet points
    const lines = response.split(/[\n•\d.]+/).filter((line) => line.trim().length > 0);
    return lines.slice(0, 5).map((action, index) => ({
      action: action.trim(),
      priority: (
        index === 0 ? 'URGENT' : index === 1 ? 'HIGH' : 'MEDIUM'
      ) as 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW',
      impact: 'Project schedule',
    }));
  }

  /**
   * Categorize defects from trial observations
   */
  private categorizeDefects(
    trialData: any[]
  ): Array<{ category: string; count: number; trend: string }> {
    const defects = trialData
      .filter((t) => t.rejectedParts && t.rejectedParts > 0)
      .reduce(
        (acc, trial) => {
          acc[trial.observations || 'Other'] = (acc[trial.observations || 'Other'] || 0) + trial.rejectedParts;
          return acc;
        },
        {} as Record<string, number>
      );

    return (Object.entries(defects) as Array<[string, number]>)
      .map(([category, count]) => ({
        category,
        count,
        trend: count > 10 ? 'RISING' : 'STABLE',
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate quality trend from trial data
   */
  private calculateTrend(trialData: any[]): 'IMPROVING' | 'STABLE' | 'DECLINING' {
    if (trialData.length < 2) return 'STABLE';
    const recent = trialData.slice(-5);
    const older = trialData.slice(-10, -5);

    const recentFailRate = recent.filter((t) => t.result === 'FAIL').length / Math.max(recent.length, 1);
    const olderFailRate = older.filter((t) => t.result === 'FAIL').length / Math.max(older.length, 1);

    if (recentFailRate < olderFailRate * 0.8) return 'IMPROVING';
    if (recentFailRate > olderFailRate * 1.2) return 'DECLINING';
    return 'STABLE';
  }

  /**
   * Handle API errors with user-friendly messages
   */
  private handleApiError(error: any, commandId: string): Error {
    if (error.response?.status === 401) {
      return new Error('Session expired. Please log in again.');
    }
    if (error.response?.status === 403) {
      return new Error('Insufficient permissions to execute this command.');
    }
    if (error.response?.status === 404) {
      return new Error(`Resource not found. Please check project/order exists.`);
    }
    if (error.response?.status === 429) {
      return new Error('Rate limit exceeded. Please try again in a few moments.');
    }
    const errorMsg = error.message ?? '';
    if (errorMsg.includes('timeout')) {
      return new Error(`Analysis took too long. Please try again.`);
    }
    if (errorMsg.includes('Network')) {
      return new Error('Network error. Please check your connection.');
    }
    return new Error(`${commandId} analysis failed: ${errorMsg || 'Unknown error'}`);
  }
}

// TimeoutError class for better error handling
class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// Export singleton instance
export default new AICommandService();
