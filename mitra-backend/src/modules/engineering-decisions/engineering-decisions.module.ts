import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { PlatformModule } from '../platform/platform.module';
import { EngineeringDecision } from './entities/engineering-decision.entity';
import { EngineeringDecisionService } from './services/engineering-decision.service';
import { EngineeringDecisionsController } from './controllers/engineering-decisions.controller';

/**
 * Engineering Decision Log (M1 Sprint 1).
 * Depends on AuditModule (audit trail) and PlatformModule (OutboxService —
 * transactional domain events).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([EngineeringDecision]),
    AuditModule,
    PlatformModule,
  ],
  controllers: [EngineeringDecisionsController],
  providers: [EngineeringDecisionService],
  exports: [EngineeringDecisionService],
})
export class EngineeringDecisionsModule {}