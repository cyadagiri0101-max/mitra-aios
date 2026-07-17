import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DispatchPlan } from './entities/dispatchplan.entity';
import { DispatchService } from './services/dispatch.service';
import { DispatchController } from './controllers/dispatch.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DispatchPlan])],
  providers: [DispatchService],
  controllers: [DispatchController],
  exports: [DispatchService],
})
export class DispatchModule {}
