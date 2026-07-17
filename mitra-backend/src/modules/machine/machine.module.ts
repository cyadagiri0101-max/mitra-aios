import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MachineType } from './entities/machinetype.entity';
import { MachineMaster } from './entities/machinemaster.entity';
import { MachineCalendar } from './entities/machinecalendar.entity';
import { MachineBooking } from './entities/machinebooking.entity';
import { MachineTypeService } from './services/machinetype.service';
import { MachineTypeController } from './controllers/machinetype.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MachineType, MachineMaster, MachineCalendar, MachineBooking])],
  controllers: [MachineTypeController],
  providers: [MachineTypeService],
  exports: [MachineTypeService, TypeOrmModule],
})
export class MachineModule {}
