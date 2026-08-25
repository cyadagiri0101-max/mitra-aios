/**
 * MITRA Engineering Intelligence Platform
 * M12.4 — Live Engineering Operations & Workspace Integration
 * Central Engineering API Client Abstraction
 */

import { api } from '../utils/api';
import axios, { AxiosError } from 'axios';

// ============================================================================
// 1. DOMAIN ENUMS & BASE TYPES
// ============================================================================

export type DeliverableStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'VERIFIED'
  | 'APPROVED'
  | 'REJECTED'
  | 'BLOCKED';

export type BlockerSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type HumanDecisionStatus =
  | 'PENDING_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'OVERRIDDEN';

export type OverlayState =
  | 'BLOCKER_CRITICAL'
  | 'EVIDENCE_MISSING'
  | 'CAPACITY_OVERLOAD'
  | 'REVISION_DELTA'
  | 'T0_MODIFICATION'
  | 'VERIFIED_RELEASED';

export type DiscrepancyType =
  | 'STATUS_MISMATCH'
  | 'MISSING_IN_SYSTEM'
  | 'MISSING_IN_SHEET'
  | 'HASH_DRIFT';

// ============================================================================
// 2. REQUEST & RESPONSE DTOS
// ============================================================================

// --- Design Lifecycle & WBS ---
export interface DesignComponentDto {
  id: string;
  projectId: string;
  workPackageId: string;
  componentCode: string;
  componentName: string;
  cadFileReference?: string;
  complexityScore: number;
  currentRevisionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkPackageDto {
  projectId: string;
  packageName: string;
  description?: string;
  targetCompletionDate?: string;
}

export interface HistoricalWorkloadDto {
  id: string;
  projectId: string;
  componentType: string;
  plannedHours: number;
  actualHours: number;
  varianceRatio: number;
  complexityLevel: string;
}

// --- Design Planning & Capacity ---
export interface EngineerCapacitySummary {
  engineerId: string;
  engineerName: string;
  role: string;
  maxWeeklyHours: number;
  allocatedHours: number;
  utilizationPercentage: number;
  isOverloaded: boolean;
  assignedDeliverablesCount: number;
}

export interface TeamCapacityBoardResponse {
  totalCapacityHours: number;
  totalAllocatedHours: number;
  overallUtilizationPercentage: number;
  overloadedEngineersCount: number;
  engineers: EngineerCapacitySummary[];
}

export interface ProjectControlMetricsResponse {
  projectId: string;
  totalEstimatedHours: number;
  burnRateHoursPerDay: number;
  plannedFinishDate: string;
  forecastedFinishDate: string;
  slippageDays: number;
  complexityMultiplier: number;
}

export interface ProjectAcceptanceSimulationDto {
  candidateProjectId: string;
  complexityScore: number;
  targetDeliveryWeeks: number;
  estimatedWorkloadHours: number;
}

export interface ProjectAcceptanceSimulationResult {
  isFeasible: boolean;
  feasibilityScore: number; // 0..100
  bufferHoursRemaining: number;
  potentialBottlenecks: string[];
  recommendation: 'ACCEPT' | 'REJECT' | 'REPLAN_SCHEDULE';
  rationale: string;
}

export interface WhatIfSimulationDto {
  projectId: string;
  unavailableEngineerIds: string[];
  reassignedEngineerIds?: string[];
}

export interface WhatIfSimulationResult {
  impactedDeliverablesCount: number;
  estimatedDelayDays: number;
  capacityDeficitHours: number;
  reassignmentRecommendations: Array<{
    deliverableId: string;
    fromEngineerId: string;
    toEngineerId: string;
  }>;
}

// --- Component Operations & Deliverables ---
export interface DesignChecklistItemDto {
  id: string;
  deliverableId: string;
  itemDescription: string;
  isMandatory: boolean;
  isCompleted: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface DesignComponentDeliverableDto {
  id: string;
  componentId: string;
  projectId: string;
  deliverableName: string;
  status: DeliverableStatus;
  assignedEngineerId?: string;
  assignedEngineerName?: string;
  evidenceFileHash?: string;
  isEvidenceLinked: boolean;
  activeBlockerCount: number;
  checklists: DesignChecklistItemDto[];
  dueDate?: string;
}

export interface UpdateDeliverableStatusDto {
  status: DeliverableStatus;
  evidenceHash?: string;
  notes?: string;
}

export interface BulkAssignDeliverablesDto {
  deliverableIds: string[];
  engineerId: string;
}

export interface ToggleChecklistItemDto {
  isCompleted: boolean;
  verifiedBy: string;
}

// --- Tracking Copilot & Health ---
export interface GroundedEvidenceRef {
  sourceType: 'DELIVERABLE' | 'BLOCKER' | 'CAPACITY' | 'GEOMETRY' | 'TRACKING_SHEET';
  sourceId: string;
  title: string;
  sha256?: string;
  status: string;
}

export interface ComprehensiveProjectHealthResponse {
  projectId: string;
  scheduleHealthScore: number;
  overallStatus: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL' | 'BLOCKED';
  activeDeliverablesCount: number;
  completedDeliverablesCount: number;
  blockedDeliverablesCount: number;
  missingEvidenceCount: number;
  discrepancyCount: number;
  totalPlannedHours: number;
  totalActualHours: number;
  burnRateVariancePercentage: number;
  topBlockers: Array<{
    id: string;
    title: string;
    severity: BlockerSeverity;
    assignedTo?: string;
  }>;
  citations: Array<{
    sourceType: string;
    sourceId: string;
    referenceLabel: string;
  }>;
}

export interface ProjectPendingWorkResponse {
  projectId: string;
  pendingDeliverables: DesignComponentDeliverableDto[];
  activeBlockers: Array<{
    id: string;
    componentId: string;
    title: string;
    severity: BlockerSeverity;
    reason: string;
  }>;
  totalPendingHours: number;
}

export interface CopilotStatusQueryDto {
  projectId?: string;
  queryText: string;
  contextScope?: 'PROJECT' | 'PORTFOLIO' | 'ENGINEER' | 'EVIDENCE' | 'GEOMETRY';
}

export interface CopilotGroundedResponse {
  answer: string;
  detectedIntent: string;
  confidenceScore: number;
  isAutonomousDecision: false;
  groundedEvidence: GroundedEvidenceRef[];
}

export interface TrackingSheetReconciliationReport {
  projectId: string;
  totalTrackingRows: number;
  matchedDeliverablesCount: number;
  discrepanciesCount: number;
  discrepancies: Array<{
    trackingSheetRowId: string;
    deliverableId?: string;
    componentCode: string;
    sheetStatus: string;
    systemStatus: string;
    discrepancyType: DiscrepancyType;
    suggestedResolution: string;
  }>;
}

// --- Trade-off Synthesis Engine ---
export interface SynthesizeTradeoffDto {
  projectId: string;
  componentId: string;
  objectiveWeights: {
    toolingCost: number;
    cycleTime: number;
    scrapRisk: number;
    leadTimeDays: number;
    designCapacityHours: number;
    toolProvingRisk: number;
  };
  hardConstraints: {
    maxToolingCost?: number;
    maxCycleTimeSeconds?: number;
    maxScrapRiskPercentage?: number;
    maxLeadTimeDays?: number;
  };
}

export interface TradeoffCandidateOption {
  candidateId: string;
  candidateName: string;
  toolingCost: number;
  cycleTimeSeconds: number;
  scrapRiskPercentage: number;
  leadTimeDays: number;
  t0RiskScore: number;
  isParetoOptimal: boolean;
  sacrifices: string[];
}

export interface EngineeringTradeoffStudyDto {
  id: string;
  projectId: string;
  componentId: string;
  decisionStatus: HumanDecisionStatus;
  candidates: TradeoffCandidateOption[];
  recommendedCandidateId?: string;
  selectedCandidateId?: string;
  reviewedBy?: string;
  reviewRationale?: string;
  isAutonomousDecision: false;
  createdAt: string;
}

export interface RecordHumanDecisionDto {
  decisionStatus: 'ACCEPTED' | 'REJECTED' | 'OVERRIDDEN';
  selectedCandidateId: string;
  rationale: string;
  reviewedBy: string;
}

// --- 3D Digital Thread & Geometry ---
export interface DigitalThreadGeometryAssetDto {
  id: string;
  projectId: string;
  componentId: string;
  revisionCode: string;
  sourceFileHash: string;
  fileFormat: string;
  activeOverlay: OverlayState;
  isAmbiguous: boolean;
  confidenceScore: number;
  boundingBoxEnvelope: [number, number, number];
}

export interface PerformMeasurementDto {
  geometryAssetId: string;
  pointA: [number, number, number];
  pointB: [number, number, number];
  measurementMode: 'EUCLIDEAN_POINT_TO_POINT' | 'FACE_NORMAL_DISTANCE' | 'WALL_THICKNESS_APPROX';
}

export interface GovernedMeasurementResult {
  distanceMm: number;
  confidence: number;
  disclaimer: 'DECISION SUPPORT MEASUREMENT — NOT CMM CERTIFIED. Refer to certified metrology reports for production release.';
  isCmmCertified: false;
  auditLogId: string;
}

export interface EkosVisualNeighborhoodResponse {
  nodeId: string;
  nodeType: string;
  connectedNodes: Array<{
    id: string;
    label: string;
    type: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    relationship: string;
  }>;
}

// --- Tool Proving Lifecycle ---
export interface ToolProvingCycleDto {
  id: string;
  projectId: string;
  toolId: string;
  cycleType: 'T0' | 'T1' | 'T2' | 'RELEASED';
  modificationHours: number;
  findingsCount: number;
  isApprovedForProduction: boolean;
  createdAt: string;
}

export interface CreateToolProvingCycleDto {
  projectId: string;
  toolId: string;
  cycleType: 'T0' | 'T1' | 'T2';
  modificationHours: number;
  findingsCount?: number;
}

// --- Enterprise Portfolio Orchestration (M12.5-P1) ---
export interface ProjectDemandBreakdownDto {
  projectId: string;
  projectName: string;
  complexityTier: string;
  estimatedTotalHours: number;
  remainingDemandHours: number;
  workPackagesCount: number;
  totalDeliverablesCount: number;
  completedDeliverablesCount: number;
  pendingDeliverablesCount: number;
  uncalibratedDeliverablesCount: number;
  varianceMultiplier: number;
}

export interface PortfolioDemandSummaryDto {
  tenantId: string;
  totalDemandHours: number;
  totalDeliverablesCount: number;
  totalPendingDeliverablesCount: number;
  activeProjectsCount: number;
  uncalibratedDeliverablesCount: number;
  projects: ProjectDemandBreakdownDto[];
}

export interface EngineerCapacityDetailDto {
  engineerId: string;
  name: string;
  role: string;
  proficiencyLevel: string;
  baseWeeklyCapacityHours: number;
  allocatedHoursPerWeek: number;
  remainingCapacityHours: number;
  utilizationPercentage: number;
  isOverloaded: boolean;
  isUnderutilized: boolean;
  skills: Array<{ skillType: string; level: string; yearsExperience: number }>;
  activeAllocations: Array<{
    allocationId: string;
    projectId: string;
    allocatedHours: number;
    role: string;
    status: string;
  }>;
}

export interface PortfolioCapacitySummaryDto {
  tenantId: string;
  totalEngineersCount: number;
  totalAvailableWeeklyCapacityHours: number;
  totalAllocatedWeeklyCapacityHours: number;
  overallUtilizationPercentage: number;
  overloadedEngineersCount: number;
  underutilizedEngineersCount: number;
  engineers: EngineerCapacityDetailDto[];
}

export interface DetectedBottleneckDto {
  bottleneckId: string;
  type: 'ENGINEER_OVERLOAD' | 'SKILL_SHORTAGE' | 'DEADLINE_COLLISION' | 'DEPENDENCY_BLOCKAGE' | 'CAPACITY_DEFICIT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  projectId?: string;
  resourceId?: string;
  description: string;
  impactSummary: string;
  recommendedAction: string;
}

export interface BalancingRecommendationDto {
  recommendationId: string;
  type: 'REALLOCATE_ENGINEER' | 'LEVEL_WORKLOAD' | 'STAGGER_DEADLINE' | 'SKILL_UPSKILL';
  sourceProjectId?: string;
  targetProjectId?: string;
  engineerId?: string;
  engineerName?: string;
  suggestedHours: number;
  expectedUtilizationDelta: number;
  rationale: string;
  isAutonomousDecision: false;
}

export interface BalancingAnalysisResultDto {
  tenantId: string;
  timestamp: string;
  overallHealthScore: number;
  bottlenecks: DetectedBottleneckDto[];
  recommendations: BalancingRecommendationDto[];
  isAutonomousDecision: false;
}

export interface CrossProjectAllocationDto {
  id: string;
  tenantId: string;
  projectId: string;
  workPackageId?: string | null;
  deliverableId?: string | null;
  engineerId: string;
  engineerName: string;
  allocationRole: string;
  allocatedHoursPerWeek: number;
  allocatedWorkloadUnits: number;
  startDate: string;
  endDate: string;
  allocationStatus: 'ACTIVE' | 'PROPOSED' | 'RELEASED' | 'OVERRIDDEN';
  skillFitScore: number;
  source: 'MANUAL_ASSIGNMENT' | 'BALANCING_SCENARIO' | 'LEGACY_IMPORT';
  reviewedBy?: string | null;
  reviewRationale?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCrossProjectAllocationDto {
  projectId: string;
  engineerId: string;
  engineerName?: string;
  workPackageId?: string;
  deliverableId?: string;
  allocationRole: string;
  allocatedHoursPerWeek: number;
  allocatedWorkloadUnits?: number;
  startDate: string;
  endDate: string;
  reviewRationale?: string;
}

export interface UpdateAllocationStatusDto {
  status: 'ACTIVE' | 'RELEASED' | 'OVERRIDDEN';
  rationale?: string;
}

export interface EnterprisePortfolioSnapshotDto {
  id: string;
  tenantId: string;
  snapshotName: string;
  snapshotType: 'SCHEDULED' | 'AD_HOC' | 'WHAT_IF_SCENARIO';
  includedProjectIds: string[];
  demandSummary: {
    totalDemandHours: number;
    totalDeliverablesCount: number;
    activeProjectsCount: number;
    uncalibratedDeliverablesCount: number;
    projectBreakdown: Array<{
      projectId: string;
      demandHours: number;
      deliverablesCount: number;
      complexityTier: string;
    }>;
  };
  capacitySummary: {
    totalAvailableCapacityHours: number;
    totalAllocatedCapacityHours: number;
    overallUtilizationPercentage: number;
    totalEngineersCount: number;
    overloadedEngineersCount: number;
    underutilizedEngineersCount: number;
  };
  bottlenecks: DetectedBottleneckDto[];
  recommendations: BalancingRecommendationDto[];
  isAutonomousDecision: false;
  generatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePortfolioSnapshotDto {
  snapshotName?: string;
  projectIds?: string[];
  scenarioId?: string;
}

export interface DelayedProjectItemDto {
  projectId: string;
  delayDays: number;
}

export interface ReassignmentItemDto {
  engineerId: string;
  targetProjectId: string;
  allocatedHours: number;
}

export interface SimulatePortfolioScenarioDto {
  scenarioName: string;
  addedProjectIds?: string[];
  removedProjectIds?: string[];
  delayedProjects?: DelayedProjectItemDto[];
  unavailableEngineers?: string[];
  capacityMultiplier?: number;
  reassignments?: ReassignmentItemDto[];
}

export interface ScenarioSimulationResultDto {
  scenarioName: string;
  tenantId: string;
  simulatedAt: string;
  baselineSummary: {
    totalDemandHours: number;
    totalCapacityHours: number;
    utilizationPercentage: number;
    overloadedEngineersCount: number;
  };
  simulatedSummary: {
    totalDemandHours: number;
    totalCapacityHours: number;
    utilizationPercentage: number;
    overloadedEngineersCount: number;
  };
  deltas: {
    demandHoursDelta: number;
    capacityHoursDelta: number;
    utilizationDelta: number;
    overloadedEngineersDelta: number;
  };
  affectedProjects: Array<{
    projectId: string;
    impactDescription: string;
  }>;
  affectedEngineers: Array<{
    engineerId: string;
    engineerName: string;
    previousUtilization: number;
    simulatedUtilization: number;
    status: 'OPTIMAL' | 'OVERLOADED' | 'UNDERUTILIZED';
  }>;
  scenarioBottlenecks: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
  isAutonomousDecision: false;
}

export interface PortfolioDemandQueryDto {
  projectIds?: string[];
  timeframeDays?: number;
}

export interface PortfolioCapacityQueryDto {
  timeframeDays?: number;
  engineerRole?: string;
}

export interface PortfolioBalancingQueryDto {
  targetUtilizationCap?: number;
  prioritizeNearDeadlines?: boolean;
}

// ============================================================================
// 3. NORMALIZED ERROR MODEL
// ============================================================================

export interface NormalizedApiError {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: unknown;
  isNetworkError: boolean;
  isTimeout: boolean;
  isProjectNotFound: boolean;
  isUnauthorized: boolean;
  isForbidden: boolean;
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  if (axios.isAxiosError(error) || (error as AxiosError)?.isAxiosError) {
    const err = error as AxiosError<{ message?: string | string[]; error?: string; statusCode?: number }>;
    const status = err.response?.status ?? 0;
    const responseData = err.response?.data;
    const messageRaw = responseData?.message;
    const message = Array.isArray(messageRaw)
      ? messageRaw.join('; ')
      : messageRaw || err.message || 'An unexpected API error occurred.';
    const errorCode = responseData?.error || (status ? `HTTP_${status}` : 'NETWORK_ERROR');

    const isProjectNotFound =
      status === 404 ||
      errorCode === 'PROJECT_NOT_FOUND' ||
      message.toLowerCase().includes('not found in mitra engineering database');

    return {
      statusCode: status,
      errorCode,
      message,
      details: responseData,
      isNetworkError: !err.response && !err.code?.includes('TIMEOUT'),
      isTimeout: err.code === 'ECONNABORTED' || Boolean(err.message?.toLowerCase().includes('timeout')),
      isProjectNotFound,
      isUnauthorized: status === 401,
      isForbidden: status === 403,
    };
  }

  return {
    statusCode: 0,
    errorCode: 'UNKNOWN_CLIENT_ERROR',
    message: (error as Error)?.message || 'Unknown error occurred.',
    isNetworkError: false,
    isTimeout: false,
    isProjectNotFound: false,
    isUnauthorized: false,
    isForbidden: false,
  };
}

// ============================================================================
// 4. CENTRAL ENGINEERING API ABSTRACTION
// ============================================================================

export const engineeringApi = {
  // ── Design Lifecycle & Dynamic WBS ─────────────────────────────────────────
  designLifecycle: {
    getWorkPackageComponents: async (workPackageId: string): Promise<DesignComponentDto[]> => {
      const res = await api.get<DesignComponentDto[]>(
        `/engineering/design-lifecycle/work-package/${encodeURIComponent(workPackageId)}/components`
      );
      return res.data;
    },

    createWorkPackage: async (dto: CreateWorkPackageDto): Promise<unknown> => {
      const res = await api.post('/engineering/design-lifecycle/work-package', dto);
      return res.data;
    },

    getHistoricalWorkloadRatios: async (projectId?: string): Promise<HistoricalWorkloadDto[]> => {
      const res = await api.get<HistoricalWorkloadDto[]>('/engineering/design-lifecycle/historical-workload', {
        params: projectId ? { projectId } : {},
      });
      return res.data;
    },
  },

  // ── Design Planning & Capacity Control ─────────────────────────────────────
  designPlanning: {
    getTeamCapacityBoard: async (): Promise<TeamCapacityBoardResponse> => {
      const res = await api.get<TeamCapacityBoardResponse>('/engineering/design-planning/team-capacity');
      return res.data;
    },

    getProjectControlMetrics: async (projectId: string): Promise<ProjectControlMetricsResponse> => {
      const res = await api.get<ProjectControlMetricsResponse>(
        `/engineering/design-planning/project-control/${encodeURIComponent(projectId)}`
      );
      return res.data;
    },

    simulateProjectAcceptance: async (
      dto: ProjectAcceptanceSimulationDto
    ): Promise<ProjectAcceptanceSimulationResult> => {
      const res = await api.post<ProjectAcceptanceSimulationResult>(
        '/engineering/design-planning/project-acceptance-simulation',
        dto
      );
      return res.data;
    },

    simulateWhatIfCapacity: async (dto: WhatIfSimulationDto): Promise<WhatIfSimulationResult> => {
      const res = await api.post<WhatIfSimulationResult>(
        '/engineering/design-planning/what-if-simulation',
        dto
      );
      return res.data;
    },
  },

  // ── Component Operations & Deliverables ────────────────────────────────────
  componentOperations: {
    getProjectDeliverables: async (projectId: string): Promise<DesignComponentDeliverableDto[]> => {
      const res = await api.get<DesignComponentDeliverableDto[]>(
        '/engineering/design-component-operations/deliverables',
        { params: { projectId } }
      );
      return res.data;
    },

    updateDeliverableStatus: async (
      deliverableId: string,
      dto: UpdateDeliverableStatusDto
    ): Promise<DesignComponentDeliverableDto> => {
      const res = await api.post<DesignComponentDeliverableDto>(
        `/engineering/design-component-operations/deliverable/${encodeURIComponent(deliverableId)}/status`,
        dto
      );
      return res.data;
    },

    bulkAssignDeliverables: async (
      dto: BulkAssignDeliverablesDto
    ): Promise<{ updatedCount: number; deliverableIds: string[] }> => {
      const res = await api.post<{ updatedCount: number; deliverableIds: string[] }>(
        '/engineering/design-component-operations/deliverables/bulk-assign',
        dto
      );
      return res.data;
    },

    toggleChecklistItem: async (
      checklistItemId: string,
      dto: ToggleChecklistItemDto
    ): Promise<DesignChecklistItemDto> => {
      const res = await api.post<DesignChecklistItemDto>(
        `/engineering/design-component-operations/checklist-item/${encodeURIComponent(checklistItemId)}/toggle`,
        dto
      );
      return res.data;
    },
  },

  // ── Tracking Copilot & Intelligence ────────────────────────────────────────
  trackingCopilot: {
    getComprehensiveProjectHealth: async (
      projectId: string
    ): Promise<ComprehensiveProjectHealthResponse> => {
      const res = await api.get<ComprehensiveProjectHealthResponse>(
        `/engineering/tracking-copilot/project/${encodeURIComponent(projectId)}/comprehensive-health`
      );
      return res.data;
    },

    getProjectPendingWork: async (projectId: string): Promise<ProjectPendingWorkResponse> => {
      const res = await api.get<ProjectPendingWorkResponse>(
        `/engineering/tracking-copilot/project/${encodeURIComponent(projectId)}/pending`
      );
      return res.data;
    },

    queryProjectStatus: async (dto: CopilotStatusQueryDto): Promise<CopilotGroundedResponse> => {
      const res = await api.post<CopilotGroundedResponse>(
        '/engineering/tracking-copilot/status-query',
        dto
      );
      return res.data;
    },

    reconcileTrackingSheet: async (
      projectId: string
    ): Promise<TrackingSheetReconciliationReport> => {
      const res = await api.get<TrackingSheetReconciliationReport>(
        `/engineering/tracking-copilot/tracking-sheet/${encodeURIComponent(projectId)}/reconciliation`
      );
      return res.data;
    },

    applyAutoReconciliation: async (dto: {
      projectId: string;
      discrepancyIds: string[];
    }): Promise<{ reconciledCount: number }> => {
      const res = await api.post<{ reconciledCount: number }>(
        '/engineering/tracking-copilot/vault/auto-reconcile',
        dto
      );
      return res.data;
    },
  },

  // ── Multi-Variable Trade-off Synthesis ─────────────────────────────────────
  tradeoffs: {
    synthesizeTradeoffStudy: async (
      dto: SynthesizeTradeoffDto
    ): Promise<EngineeringTradeoffStudyDto> => {
      const res = await api.post<EngineeringTradeoffStudyDto>(
        '/engineering/tradeoffs/synthesize',
        dto
      );
      return res.data;
    },

    getTradeoffStudy: async (studyId: string): Promise<EngineeringTradeoffStudyDto> => {
      const res = await api.get<EngineeringTradeoffStudyDto>(
        `/engineering/tradeoffs/study/${encodeURIComponent(studyId)}`
      );
      return res.data;
    },

    recordHumanDecision: async (
      studyId: string,
      dto: RecordHumanDecisionDto
    ): Promise<EngineeringTradeoffStudyDto> => {
      const res = await api.post<EngineeringTradeoffStudyDto>(
        `/engineering/tradeoffs/study/${encodeURIComponent(studyId)}/decision`,
        dto
      );
      return res.data;
    },
  },

  // ── 3D Digital Thread & Geometric Decisions ────────────────────────────────
  digitalThread: {
    getProjectGeometryAssets: async (
      projectId: string
    ): Promise<DigitalThreadGeometryAssetDto[]> => {
      const res = await api.get<DigitalThreadGeometryAssetDto[]>(
        `/engineering/digital-thread/geometry-assets/${encodeURIComponent(projectId)}`
      );
      return res.data;
    },

    getEkosVisualNeighborhood: async (
      nodeId: string
    ): Promise<EkosVisualNeighborhoodResponse> => {
      const res = await api.get<EkosVisualNeighborhoodResponse>(
        `/engineering/digital-thread/ekos-neighborhood/${encodeURIComponent(nodeId)}`
      );
      return res.data;
    },

    performGovernedMeasurement: async (
      dto: PerformMeasurementDto
    ): Promise<GovernedMeasurementResult> => {
      const res = await api.post<GovernedMeasurementResult>(
        '/engineering/digital-thread/caliper-measurement',
        dto
      );
      return res.data;
    },

    query3dCopilot: async (dto: {
      projectId: string;
      componentId?: string;
      queryText: string;
    }): Promise<CopilotGroundedResponse> => {
      const res = await api.post<CopilotGroundedResponse>(
        '/engineering/digital-thread/copilot-query',
        dto
      );
      return res.data;
    },
  },

  // ── Tool Proving Lifecycle ─────────────────────────────────────────────────
  toolProving: {
    getToolProvingCycles: async (projectId: string): Promise<ToolProvingCycleDto[]> => {
      const res = await api.get<ToolProvingCycleDto[]>('/engineering/tool-proving/cycles', {
        params: { projectId },
      });
      return res.data;
    },

    createToolProvingCycle: async (
      dto: CreateToolProvingCycleDto
    ): Promise<ToolProvingCycleDto> => {
      const res = await api.post<ToolProvingCycleDto>('/engineering/tool-proving/cycle', dto);
      return res.data;
    },
  },

  // ── Enterprise Portfolio Orchestration (M12.5-P1) ──────────────────────────
  portfolio: {
    getSnapshot: async (): Promise<EnterprisePortfolioSnapshotDto | null> => {
      const res = await api.get<EnterprisePortfolioSnapshotDto | null>('/engineering/portfolio/snapshot');
      return res.data;
    },

    createSnapshot: async (
      dto: CreatePortfolioSnapshotDto
    ): Promise<EnterprisePortfolioSnapshotDto> => {
      const res = await api.post<EnterprisePortfolioSnapshotDto>('/engineering/portfolio/snapshot', dto);
      return res.data;
    },

    getDemand: async (
      params?: PortfolioDemandQueryDto
    ): Promise<PortfolioDemandSummaryDto> => {
      const res = await api.get<PortfolioDemandSummaryDto>('/engineering/portfolio/demand', {
        params,
      });
      return res.data;
    },

    getCapacity: async (
      params?: PortfolioCapacityQueryDto
    ): Promise<PortfolioCapacitySummaryDto> => {
      const res = await api.get<PortfolioCapacitySummaryDto>('/engineering/portfolio/capacity', {
        params,
      });
      return res.data;
    },

    getBottlenecks: async (): Promise<BalancingAnalysisResultDto> => {
      const res = await api.get<BalancingAnalysisResultDto>('/engineering/portfolio/bottlenecks');
      return res.data;
    },

    getBalancingRecommendations: async (
      params?: PortfolioBalancingQueryDto
    ): Promise<BalancingAnalysisResultDto> => {
      const res = await api.get<BalancingAnalysisResultDto>(
        '/engineering/portfolio/balancing/recommendations',
        { params }
      );
      return res.data;
    },

    getAllocations: async (params?: {
      projectId?: string;
      engineerId?: string;
    }): Promise<CrossProjectAllocationDto[]> => {
      const res = await api.get<CrossProjectAllocationDto[]>('/engineering/portfolio/allocations', {
        params,
      });
      return res.data;
    },

    createAllocation: async (
      dto: CreateCrossProjectAllocationDto
    ): Promise<CrossProjectAllocationDto> => {
      const res = await api.post<CrossProjectAllocationDto>('/engineering/portfolio/allocation', dto);
      return res.data;
    },

    updateAllocationStatus: async (
      allocationId: string,
      dto: UpdateAllocationStatusDto
    ): Promise<CrossProjectAllocationDto> => {
      const res = await api.post<CrossProjectAllocationDto>(
        `/engineering/portfolio/allocation/${encodeURIComponent(allocationId)}/status`,
        dto
      );
      return res.data;
    },

    simulateScenario: async (
      dto: SimulatePortfolioScenarioDto
    ): Promise<ScenarioSimulationResultDto> => {
      const res = await api.post<ScenarioSimulationResultDto>(
        '/engineering/portfolio/scenario/simulate',
        dto
      );
      return res.data;
    },
  },
};
