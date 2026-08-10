import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticsReportService {
  listReports() {
    return {
      items: [
        {
          id: 'f22d1604-1a7c-4c4f-b4e0-6e4f96fb2e8f',
          name: 'Executive Summary',
          category: 'enterprise',
          description: 'Cross-domain KPI snapshot and enterprise health indicators',
          schedules: ['daily', 'weekly', 'monthly'],
        },
        {
          id: '7e7f1b42-df91-4316-89b0-a2852d416d93',
          name: 'Commercial Performance',
          category: 'commercial',
          description: 'Revenue, quotes, conversion and pipeline progression',
          schedules: ['weekly', 'monthly'],
        },
        {
          id: 'ad56c5be-b66f-4f1b-9d7f-2d612196f8fb',
          name: 'Manufacturing Throughput',
          category: 'manufacturing',
          description: 'Throughput, utilization and work-order health',
          schedules: ['hourly', 'daily'],
        },
      ],
    };
  }

  generateExport(reportId: string, format: string) {
    return {
      reportId,
      format,
      status: 'ready',
      downloadUrl: `/api/analytics/reports/${reportId}/export?format=${format}`,
      generatedAt: new Date().toISOString(),
    };
  }
}
