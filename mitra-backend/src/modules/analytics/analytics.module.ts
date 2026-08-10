import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DomainOutboxMessage } from '../platform/entities/domain-outbox.entity';
import { NcrRecord } from '../quality/entities/ncr-record.entity';
import { ServiceRequest } from '../service/entities/servicerequest.entity';
import { CommercialModule } from '../commercial/commercial.module';
import { ProjectModule } from '../project/project.module';
import { EngineeringModule } from '../engineering/engineering.module';
import { ManufacturingModule } from '../manufacturing/manufacturing.module';
import { QualityModule } from '../quality/quality.module';
import { ServiceModule } from '../service/service.module';
import { AnalyticsDashboardService } from './services/analytics-dashboard.service';
import { AnalyticsKpiService } from './services/analytics-kpi.service';
import { AnalyticsReportService } from './services/analytics-report.service';
import { AnalyticsController } from './controllers/analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([DomainOutboxMessage, NcrRecord, ServiceRequest]),
    CommercialModule,
    ProjectModule,
    EngineeringModule,
    ManufacturingModule,
    QualityModule,
    ServiceModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsDashboardService, AnalyticsKpiService, AnalyticsReportService],
  exports: [AnalyticsDashboardService, AnalyticsKpiService, AnalyticsReportService],
})
export class AnalyticsModule {}
