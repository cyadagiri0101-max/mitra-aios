export const ROUTE_DASHBOARD = '/dashboard';
export const ROUTE_PROJECTS = '/projects';
export const ROUTE_QUOTATIONS = '/quotations';
export const ROUTE_CAPA = '/capa';
export const ROUTE_DISPATCH = '/dispatch';
export const ROUTE_QUALITY = '/quality';
export const ROUTE_ANALYTICS = '/analytics';
export const ROUTE_CAPACITY = '/capacity';
export const ROUTE_SEARCH = '/search';
export const ROUTE_ENGINEERING = '/engineering';
export const ROUTE_PLANNING = '/planning';
export const ROUTE_SERVICE = '/service';
export const ROUTE_PRODUCTION = '/manufacturing';

export const APP_ROUTE_PATHS: readonly string[] = [
  '/login',
  ROUTE_DASHBOARD,
  ROUTE_PROJECTS,
  '/projects/:id',
  '/projects/:id/milestones',
  '/projects/:id/tasks',
  '/projects/:id/kanban',
  '/projects/:id/timeline',
  '/projects/:id/teams',
  '/projects/:id/risks',
  '/projects/:id/documents',
  '/projects/:id/decisions',
  '/projects/:id/baselines',
  '/enquiries',
  ROUTE_QUOTATIONS,
  '/design',
  ROUTE_PLANNING,
  '/planning/baselines',
  '/baselines',
  '/planning/capacity',
  '/planning/workload',
  '/planning/utilization',
  '/planning/what-if',
  ROUTE_CAPACITY,
  ROUTE_PRODUCTION,
  ROUTE_QUALITY,
  '/trials',
  ROUTE_CAPA,
  '/suppliers',
  '/products',
  '/tool-master',
  '/tool-master/:id',
  '/engineering-file-indexer',
  '/employees',
  '/people',
  '/engineering-decisions',
  '/design-loads',
  '/design-load',
  '/design-standards',
  '/design-systems',
  ROUTE_DISPATCH,
  ROUTE_SERVICE,
  '/service/lineage',
  '/service/lineage/:projectId',
  '/bom-analysis',
  '/drawing-analysis',
  '/ai-assistant',
  ROUTE_ANALYTICS,
  '/documents',
  '/engineering-library',
  ROUTE_ENGINEERING,
  '/customers',
  '/customers/:id',
  '/leads',
  '/rfqs',
  '/rfqs/:id',
  '/ecr-eco',
  '/workflow',
  ROUTE_SEARCH,
  '/settings',
];

export const APP_PARAM_ROUTE_PATTERNS: readonly string[] = APP_ROUTE_PATHS.filter((p) => p.includes(':'));