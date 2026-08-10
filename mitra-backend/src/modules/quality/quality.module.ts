import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformModule } from '../platform/platform.module';
import { TrialObservation } from './entities/trialobservation.entity';
import { TrialMeasurement } from './entities/trialmeasurement.entity';
import { Retrial } from './entities/retrial.entity';
import { RetrialResult } from './entities/retrialresult.entity';
import { InspectionReport } from './entities/inspectionreport.entity';
import { CapaVerification } from './entities/capaverification.entity';
import { NcrRecord } from './entities/ncr-record.entity';
import { InspectionPlan } from './entities/inspection-plan.entity';
import { SupplierInspection } from './entities/supplier-inspection.entity';
import { ControlPlan } from './entities/control-plan.entity';
import { Fmea } from './entities/fmea.entity';
import { GaugeManagement } from './entities/gauge-management.entity';
import { MsaStudy } from './entities/msa-study.entity';
import { PpapApqpRecord } from './entities/ppap-apqp.entity';
import { CustomerComplaint } from './entities/customer-complaint.entity';
import { TrialObservationService } from './services/trialobservation.service';
import { CapaService } from './services/capa.service';
import { NcrService } from './services/ncr.service';
import { InspectionPlanService } from './services/inspection-plan.service';
import { SupplierInspectionService } from './services/supplier-inspection.service';
import { ControlPlanService } from './services/control-plan.service';
import { FmeaService } from './services/fmea.service';
import { GaugeManagementService } from './services/gauge-management.service';
import { MsaStudyService } from './services/msa-study.service';
import { PpapApqpService } from './services/ppap-apqp.service';
import { CustomerComplaintService } from './services/customer-complaint.service';
import { TrialObservationController } from './controllers/trialobservation.controller';
import { CapaController } from './controllers/capa.controller';
import { NcrController } from './controllers/ncr.controller';
import { InspectionPlanController } from './controllers/inspection-plan.controller';
import { SupplierInspectionController } from './controllers/supplier-inspection.controller';
import { ControlPlanController } from './controllers/control-plan.controller';
import { FmeaController } from './controllers/fmea.controller';
import { GaugeManagementController } from './controllers/gauge-management.controller';
import { MsaStudyController } from './controllers/msa-study.controller';
import { PpapApqpController } from './controllers/ppap-apqp.controller';
import { CustomerComplaintController } from './controllers/customer-complaint.controller';

const qualityEntities = [
  TrialObservation,
  TrialMeasurement,
  Retrial,
  RetrialResult,
  InspectionReport,
  CapaVerification,
  NcrRecord,
  InspectionPlan,
  SupplierInspection,
  ControlPlan,
  Fmea,
  GaugeManagement,
  MsaStudy,
  PpapApqpRecord,
  CustomerComplaint,
];

const qualityControllers = [
  TrialObservationController,
  CapaController,
  NcrController,
  InspectionPlanController,
  SupplierInspectionController,
  ControlPlanController,
  FmeaController,
  GaugeManagementController,
  MsaStudyController,
  PpapApqpController,
  CustomerComplaintController,
];

const qualityProviders = [
  TrialObservationService,
  CapaService,
  NcrService,
  InspectionPlanService,
  SupplierInspectionService,
  ControlPlanService,
  FmeaService,
  GaugeManagementService,
  MsaStudyService,
  PpapApqpService,
  CustomerComplaintService,
];

@Module({
  imports: [TypeOrmModule.forFeature(qualityEntities), PlatformModule],
  controllers: qualityControllers,
  providers: qualityProviders,
  exports: [...qualityProviders, TypeOrmModule],
})
export class QualityModule {}
