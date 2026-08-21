import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { G14FeatureSnapshot } from './entities/g14-feature-snapshot.entity';
import { G14ModelArtifact } from './entities/g14-model-artifact.entity';
import { G14CapacitySnapshot } from './entities/g14-capacity-snapshot.entity';
import { G14CapacityModelArtifact } from './entities/g14-capacity-model-artifact.entity';
import { G14ModelRegistry } from './entities/g14-model-registry.entity';
import { G14LevelingRecommendation } from './entities/g14-leveling-recommendation.entity';
import { Project } from '../project/entities/project.entity';
import { ProjectMilestone } from '../project/entities/projectmilestone.entity';
import { ScheduleBaseline } from '../project/entities/schedule-baseline.entity';
import { WorkOrder } from '../manufacturing/entities/workorder.entity';
import { NcrRecord } from '../quality/entities/ncr-record.entity';
import { TrialObservation } from '../quality/entities/trialobservation.entity';
import { ProjectDesignLoad } from '../design-load/entities/project-design-load.entity';
import { MachineMaster } from '../machine/entities/machinemaster.entity';
import { MachineBooking } from '../machine/entities/machinebooking.entity';
import { AuditModule } from '../audit/audit.module';
import { G14TelemetryService } from './services/g14-telemetry.service';
import { G14FeatureEngineeringService } from './services/g14-feature-engineering.service';
import { G14ModelTrainingService } from './services/g14-model-training.service';
import { G14DelayInferenceService } from './services/g14-delay-inference.service';
import { G14CapacityFeatureService } from './services/g14-capacity-feature.service';
import { G14CapacityTrainingService } from './services/g14-capacity-training.service';
import { G14CapacityForecastService } from './services/g14-capacity-forecast.service';
import { G14ModelRegistryService } from './services/g14-model-registry.service';
import { G14TimelineLevelingService } from './services/g14-timeline-leveling.service';
import { G14FeatureController } from './controllers/g14-feature.controller';
import { G14PredictionController } from './controllers/g14-prediction.controller';
import { G14CapacityController } from './controllers/g14-capacity.controller';
import { G14ModelRegistryController } from './controllers/g14-model-registry.controller';
import { G14LevelingController } from './controllers/g14-leveling.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      G14FeatureSnapshot,
      G14ModelArtifact,
      G14CapacitySnapshot,
      G14CapacityModelArtifact,
      G14ModelRegistry,
      G14LevelingRecommendation,
      Project,
      ProjectMilestone,
      ScheduleBaseline,
      WorkOrder,
      NcrRecord,
      TrialObservation,
      ProjectDesignLoad,
      MachineMaster,
      MachineBooking,
    ]),
    AuditModule,
  ],
  controllers: [
    G14FeatureController,
    G14PredictionController,
    G14CapacityController,
    G14ModelRegistryController,
    G14LevelingController,
  ],
  providers: [
    G14TelemetryService,
    G14FeatureEngineeringService,
    G14ModelTrainingService,
    G14DelayInferenceService,
    G14CapacityFeatureService,
    G14CapacityTrainingService,
    G14CapacityForecastService,
    G14ModelRegistryService,
    G14TimelineLevelingService,
  ],
  exports: [
    G14TelemetryService,
    G14FeatureEngineeringService,
    G14ModelTrainingService,
    G14DelayInferenceService,
    G14CapacityFeatureService,
    G14CapacityTrainingService,
    G14CapacityForecastService,
    G14ModelRegistryService,
    G14TimelineLevelingService,
  ],
})
export class PredictiveModule {}
