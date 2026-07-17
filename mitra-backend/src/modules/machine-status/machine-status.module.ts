import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MachineTelemetry } from './entities/machine-telemetry.entity';
import { MachineStatus } from './entities/machine-status.entity';
import { MachineStatusService } from './services/machine-status.service';
import { MachineStatusController } from './controllers/machine-status.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MachineTelemetry, MachineStatus])],
  controllers: [MachineStatusController],
  providers: [MachineStatusService],
  exports: [MachineStatusService],
})
export class MachineStatusModule {}
