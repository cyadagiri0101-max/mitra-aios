import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformModule } from '../platform/platform.module';
import { ServiceRequest } from './entities/servicerequest.entity';
import { ServiceSchedule } from './entities/serviceschedule.entity';
import { ServiceReport } from './entities/servicereport.entity';
import { SparePart } from './entities/sparepart.entity';
import { ServiceInstallation } from './entities/serviceinstallation.entity';
import { ServiceWarranty } from './entities/servicewarranty.entity';
import { ServiceWarrantyClaim } from './entities/servicewarrantyclaim.entity';
import { ServiceAmcContract } from './entities/serviceamc.entity';
import { ServiceVisit } from './entities/servicevisit.entity';
import { ServiceRequestService } from './services/request.service';
import { ServiceRequestController } from './controllers/servicerequest.controller';
import { ServiceLifecycleController } from './controllers/service-lifecycle.controller';
import { InstallationService } from './services/installation.service';
import { WarrantyService, WarrantyClaimService } from './services/warranty.service';
import { AmcService } from './services/amc.service';
import { VisitService } from './services/visit.service';

@Module({
  imports: [
    PlatformModule,
    TypeOrmModule.forFeature([
      ServiceRequest,
      ServiceSchedule,
      ServiceReport,
      SparePart,
      ServiceInstallation,
      ServiceWarranty,
      ServiceWarrantyClaim,
      ServiceAmcContract,
      ServiceVisit,
    ]),
  ],
  controllers: [ServiceRequestController, ServiceLifecycleController],
  providers: [
    ServiceRequestService,
    InstallationService,
    WarrantyService,
    WarrantyClaimService,
    AmcService,
    VisitService,
  ],
  exports: [ServiceRequestService, InstallationService, WarrantyService, WarrantyClaimService, AmcService, VisitService, TypeOrmModule],
})
export class ServiceModule {}
