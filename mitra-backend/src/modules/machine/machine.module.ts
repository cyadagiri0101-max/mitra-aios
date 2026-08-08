import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MachineType } from './entities/machinetype.entity';
import { MachineMaster } from './entities/machinemaster.entity';
import { MachineCalendar } from './entities/machinecalendar.entity';
import { MachineBooking } from './entities/machinebooking.entity';
import { MachineTypeService } from './services/machinetype.service';
import { MachineMasterService } from './services/machinemaster.service';
import { MachineTypeController } from './controllers/machinetype.controller';
import { MachineMasterController } from './controllers/machinemaster.controller';
import { PlatformModule } from '../platform/platform.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MachineType, MachineMaster, MachineCalendar, MachineBooking]),
    PlatformModule,
  ],
  controllers: [MachineTypeController, MachineMasterController],
  providers: [MachineTypeService, MachineMasterService],
  exports: [MachineTypeService, MachineMasterService, TypeOrmModule],
})
export class MachineModule {}
