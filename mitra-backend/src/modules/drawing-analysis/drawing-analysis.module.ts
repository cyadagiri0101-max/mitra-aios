import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DrawingAnalysis } from './entities/drawing-analysis.entity';
import { DrawingAnalysisService } from './services/drawing-analysis.service';
import { DrawingAnalysisController } from './controllers/drawing-analysis.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DrawingAnalysis])],
  controllers: [DrawingAnalysisController],
  providers: [DrawingAnalysisService],
  exports: [DrawingAnalysisService],
})
export class DrawingAnalysisModule {}
