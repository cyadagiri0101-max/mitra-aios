import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EngineeringFileIndex } from './entities/engineering-file-index.entity';
import { EngineeringFileIndexerService } from './services/engineering-file-indexer.service';
import { EngineeringFileIndexController, EngineeringFileIndexerController } from './controllers/engineering-file-indexer.controller';
import { ToolMaster } from '../tool-master/entities/tool-master.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EngineeringFileIndex, ToolMaster])],
  controllers: [EngineeringFileIndexerController, EngineeringFileIndexController],
  providers: [EngineeringFileIndexerService],
  exports: [EngineeringFileIndexerService],
})
export class EngineeringFileIndexerModule {}
