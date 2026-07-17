import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BomAnalysis } from './entities/bom-analysis.entity';
import { BomItem } from './entities/bom-item.entity';
import { BomAnalysisService } from './services/bom-analysis.service';
import { BomAnalysisController } from './controllers/bom-analysis.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BomAnalysis, BomItem])],
  controllers: [BomAnalysisController],
  providers: [BomAnalysisService],
  exports: [BomAnalysisService],
})
export class BomAnalysisModule {}
