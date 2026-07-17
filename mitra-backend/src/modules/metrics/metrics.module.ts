import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';

/**
 * MetricsModule is @Global so MetricsService can be injected anywhere.
 *
 * The MetricsInterceptor is registered as an APP_INTERCEPTOR so it
 * captures every request across every module — including health checks,
 * auth endpoints, and all domain modules.
 *
 * Import order in AppModule matters: MetricsModule should come after
 * TypeOrmModule so the DataSource is available for pool stats.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([])],  // for DataSource injection
  providers: [
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  controllers: [MetricsController],
  exports: [MetricsService],
})
export class MetricsModule {}
