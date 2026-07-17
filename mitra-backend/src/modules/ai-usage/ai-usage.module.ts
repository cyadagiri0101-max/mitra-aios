import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiUsageRecord } from './entities/ai-usage-record.entity';
import { AiUsageService } from './services/ai-usage.service';
import { AiUsageController } from './controllers/ai-usage.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AiUsageRecord])],
  controllers: [AiUsageController],
  providers: [AiUsageService],
  exports: [AiUsageService],
})
export class AiUsageModule {}
