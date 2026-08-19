import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformModule } from '../platform/platform.module';
import { DispatchPlan } from './entities/dispatchplan.entity';
import { DispatchService } from './services/dispatch.service';
import { DispatchController } from './controllers/dispatch.controller';

@Module({
  imports: [
    PlatformModule,
    TypeOrmModule.forFeature([DispatchPlan]),
  ],
  providers: [DispatchService],
  controllers: [DispatchController],
  exports: [DispatchService, TypeOrmModule],
})
export class DispatchModule {}
