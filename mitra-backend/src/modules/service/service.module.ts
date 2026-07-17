import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceRequest } from './entities/servicerequest.entity';
import { ServiceSchedule } from './entities/serviceschedule.entity';
import { ServiceReport } from './entities/servicereport.entity';
import { SparePart } from './entities/sparepart.entity';
import { ServiceRequestService } from './services/request.service';
import { ServiceRequestController } from './controllers/servicerequest.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceRequest, ServiceSchedule, ServiceReport, SparePart])],
  controllers: [ServiceRequestController],
  providers: [ServiceRequestService],
  exports: [ServiceRequestService, TypeOrmModule],
})
export class ServiceModule {}
