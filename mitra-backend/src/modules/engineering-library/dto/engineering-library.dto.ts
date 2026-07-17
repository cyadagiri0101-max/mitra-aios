export class EklSyncStatusDto {
  syncedAt: string | null;
  projectCount: number;
  documentCount: number;
  status: string;
}

export class EklDashboardWidgetDto {
  totalProjects: number;
  totalDocuments: number;
  status: string;
}

export class EklSearchResultDto {
  results: unknown[];
}
