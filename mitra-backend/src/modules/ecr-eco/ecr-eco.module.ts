import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EngineeringChangeRequest } from './entities/engineeringchangerequest.entity';
import { EngineeringChangeOrder } from './entities/engineeringchangeorder.entity';
import { EcrAffectedPart } from './entities/ecraffectedpart.entity';
import { EcoImplementation } from './entities/ecoimplementation.entity';
import { EngineeringChangeNotice } from './entities/engineering-change-notice.entity';
import { EngineeringChangeImpact } from './entities/engineering-change-impact.entity';
import { EngineeringChangeRequestService } from './services/engineeringchangerequest.service';
import { EngineeringChangeRequestController } from './controllers/engineeringchangerequest.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EngineeringChangeRequest,
      EngineeringChangeOrder,
      EcrAffectedPart,
      EcoImplementation,
      EngineeringChangeNotice,
      EngineeringChangeImpact,
    ]),
  ],
  controllers: [EngineeringChangeRequestController],
  providers: [EngineeringChangeRequestService],
  exports: [EngineeringChangeRequestService, TypeOrmModule],
})
export class EcrEcoModule {}
