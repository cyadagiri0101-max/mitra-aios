import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrialObservation } from './entities/trialobservation.entity';
import { TrialMeasurement } from './entities/trialmeasurement.entity';
import { Retrial } from './entities/retrial.entity';
import { RetrialResult } from './entities/retrialresult.entity';
import { InspectionReport } from './entities/inspectionreport.entity';
import { CapaVerification } from './entities/capaverification.entity';
import { TrialObservationService } from './services/trialobservation.service';
import { CapaService } from './services/capa.service';
import { TrialObservationController } from './controllers/trialobservation.controller';
import { CapaController } from './controllers/capa.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TrialObservation, TrialMeasurement, Retrial, RetrialResult, InspectionReport, CapaVerification])],
  controllers: [TrialObservationController, CapaController],
  providers: [TrialObservationService, CapaService],
  exports: [TrialObservationService, CapaService, TypeOrmModule],
})
export class QualityModule {}
