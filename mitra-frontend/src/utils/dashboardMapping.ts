import {
  ROUTE_PROJECTS,
  ROUTE_QUOTATIONS,
  ROUTE_CAPA,
  ROUTE_DISPATCH,
  ROUTE_QUALITY,
} from './routeManifest';

export const PROJECT_STAGE_ORDER: readonly string[] = [
  'ENQUIRY',
  'QUOTATION',
  'APPROVAL',
  'PROJECT_CREATED',
  'DESIGN_INITIATED',
  'CPS_APPROVED',
  'DESIGN_RELEASED',
  'PROCESS_PLANNING',
  'MACHINE_PLANNING',
  'MANUFACTURING',
  'INTERNAL_TRIAL',
  'CUSTOMER_TRIAL',
  'CAPA',
  'RETRIAL',
  'CUSTOMER_APPROVAL',
  'DISPATCH',
  'SERVICE',
];

export const PROJECT_STAGE_LABELS: Record<string, string> = {
  ENQUIRY: 'Enquiry',
  QUOTATION: 'Quotation',
  APPROVAL: 'Approval',
  PROJECT_CREATED: 'Project Created',
  DESIGN_INITIATED: 'Design Initiated',
  CPS_APPROVED: 'CPS Approved',
  DESIGN_RELEASED: 'Design Released',
  PROCESS_PLANNING: 'Process Planning',
  MACHINE_PLANNING: 'Machine Planning',
  MANUFACTURING: 'Manufacturing',
  INTERNAL_TRIAL: 'Internal Trial',
  CUSTOMER_TRIAL: 'Customer Trial',
  CAPA: 'CAPA',
  RETRIAL: 'Retrial',
  CUSTOMER_APPROVAL: 'Customer Approval',
  DISPATCH: 'Dispatch',
  SERVICE: 'Service',
};

export interface WorkflowStage {
  code: string;
  label: string;
  count: number;
}

export function buildWorkflowStages(byStage?: Record<string, number> | null): WorkflowStage[] {
  if (!byStage || typeof byStage !== 'object') return [];
  return PROJECT_STAGE_ORDER.filter((code) => (byStage[code] ?? 0) > 0).map((code) => ({
    code,
    label: PROJECT_STAGE_LABELS[code] ?? code,
    count: byStage[code] ?? 0,
  }));
}

export interface DashboardSummary {
  totalProjects: number;
  activeProjects: number;
  inDispatch: number;
  openCapas: number;
  openNcrs: number;
  quotationValue: number;
  closureRatePct: number;
  passRatePct: number;
}

export function summarizeDashboard(data: unknown): DashboardSummary | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, any>;
  const ap = d.activeProjects ?? {};
  const qp = d.qualityPerformance ?? {};
  const ss = d.serviceStatus ?? {};
  const qv = d.quotationValue ?? {};
  const pass = qp.inspectionPassRate ?? {};
  return {
    totalProjects: Number(ap.total ?? 0),
    activeProjects: Number(ap.active ?? 0),
    inDispatch: Number(ap.dispatched ?? 0),
    openCapas: Number(qp.capaOpenCount ?? 0),
    openNcrs: Number(qp.openNcrs ?? 0),
    quotationValue: Number(qv.value ?? 0),
    closureRatePct: Number(ss.closureRatePct ?? 0),
    passRatePct: Number(pass.passRatePct ?? 0),
  };
}

export interface ProjectTrendPoint {
  month: string;
  value: number;
}

export interface QualityTrendPoint {
  month: string;
  ncrs: number;
  capas: number;
}

export interface TrendsData {
  projectTrends: ProjectTrendPoint[];
  qualityTrends: QualityTrendPoint[];
}

export function mapTrends(data: unknown): TrendsData {
  if (!data || typeof data !== 'object') return { projectTrends: [], qualityTrends: [] };
  const d = data as Record<string, any>;
  return {
    projectTrends: Array.isArray(d.projectTrends) ? d.projectTrends : [],
    qualityTrends: Array.isArray(d.qualityTrends) ? d.qualityTrends : [],
  };
}

export interface OutboxEvent {
  eventType: string;
  count: number;
}

export function mapOutboxEvents(snapshot: unknown): OutboxEvent[] {
  if (!Array.isArray(snapshot)) return [];
  return snapshot
    .map((row: any) => ({
      eventType: String(row?.eventType ?? ''),
      count: Number(row?.count ?? 0),
    }))
    .filter((row) => row.eventType.length > 0);
}

export function humanizeEventType(eventType: string): string {
  return eventType
    .replace(/_/g, ' ')
    .replace(/\b\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export const DASHBOARD_REFRESH_MS = 5 * 60 * 1000;
export const DASHBOARD_REFRESH_LABEL = 'Refreshes every 5 minutes';

export const DASHBOARD_DRILLDOWN_ROUTES: readonly string[] = [
  ROUTE_PROJECTS,
  ROUTE_DISPATCH,
  ROUTE_CAPA,
  ROUTE_QUOTATIONS,
  ROUTE_QUALITY,
];