import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { IndustrialSubscriber } from './common/subscribers/industrial.subscriber';

import { AiModule } from './modules/ai/ai.module';
import { HealthModule } from './modules/health/health.module';
import { PlatformModule } from './modules/platform/platform.module';
import { ProjectModule } from './modules/project/project.module';
import { DesignModule } from './modules/design/design.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { CommercialModule } from './modules/commercial/commercial.module';
import { CPSModule } from './modules/cps/cps.module';
import { CustomerModule } from './modules/customer/customer.module';
import { ManufacturingModule } from './modules/manufacturing/manufacturing.module';
import { QualityModule } from './modules/quality/quality.module';
import { PlanningModule } from './modules/planning/planning.module';
import { MachineModule } from './modules/machine/machine.module';
import { MoldModule } from './modules/mold/mold.module';
import { DocumentModule } from './modules/document/document.module';
import { ServiceModule } from './modules/service/service.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { SearchModule } from './modules/search/search.module';
import { FolderIntelligenceModule } from './modules/folder-intelligence/folder-intelligence.module';
import { EcrEcoModule } from './modules/ecr-eco/ecr-eco.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { AuditModule } from './modules/audit/audit.module';
import { StorageModule } from './modules/storage/storage.module';
// import { CacheModule } from './modules/cache/cache.module';  // TEMP: disabled for local dev without Redis
import { BomAnalysisModule } from './modules/bom-analysis/bom-analysis.module';
import { DrawingAnalysisModule } from './modules/drawing-analysis/drawing-analysis.module';
import { MachineStatusModule } from './modules/machine-status/machine-status.module';
import { AiUsageModule } from './modules/ai-usage/ai-usage.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { ProductModule } from './modules/product/product.module';
import { ToolMasterModule } from './modules/tool-master/tool-master.module';
import { EngineeringFileIndexerModule } from './modules/engineering-file-indexer/engineering-file-indexer.module';
import { EngineeringLibraryModule } from './modules/engineering-library/engineering-library.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'mitra_admin'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME', 'mitra_v2'),
        autoLoadEntities: true,
        synchronize: configService.get('NODE_ENV') === 'production'
          ? false
          : configService.get('DB_SYNC', 'false') === 'true',
        logging: configService.get('DB_LOGGING', 'false') === 'true'
          ? (['query', 'error'] as const)
          : false,
        ssl: configService.get('DB_SSL', 'false') === 'true',
        extra: {
          // Connection pool — tune DB_POOL_MAX/MIN to match your PostgreSQL max_connections
          max: parseInt(process.env.DB_POOL_MAX ?? '20', 10),
          min: parseInt(process.env.DB_POOL_MIN ?? '2', 10),
          idleTimeoutMillis:      30_000,
          connectionTimeoutMillis: 5_000,
          // PostgreSQL 18 compatibility: pg 8.x supports PG 12–18+ natively.
          // No driver-level changes required for PG18.
        },
      }),
      inject: [ConfigService],
    }),
    HealthModule,
    AiModule,
    PlatformModule,
    ProjectModule,
    DesignModule,
    WorkflowModule,
    CommercialModule,
    CPSModule,
    CustomerModule,
    ManufacturingModule,
    QualityModule,
    PlanningModule,
    MachineModule,
    MoldModule,
    DocumentModule,
    ServiceModule,
    CollaborationModule,
    KnowledgeModule,
    SearchModule,
    FolderIntelligenceModule,
    EcrEcoModule,
    DispatchModule,
    AuditModule,
    MetricsModule,
    StorageModule,
    // CacheModule,  // TEMP: disabled for local dev without Redis
    BomAnalysisModule,
    DrawingAnalysisModule,
    MachineStatusModule,
    AiUsageModule,
    SupplierModule,
    ProductModule,
    ToolMasterModule,
    EngineeringFileIndexerModule,
    EngineeringLibraryModule,
  ],
  providers: [
    IndustrialSubscriber,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
