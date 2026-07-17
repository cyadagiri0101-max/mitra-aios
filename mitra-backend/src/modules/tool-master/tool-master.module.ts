import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EngineeringFileIndexerModule } from '../engineering-file-indexer/engineering-file-indexer.module';
import { ToolMaster } from './entities/tool-master.entity';
import { ToolMasterService } from './services/tool-master.service';
import { ToolMasterMetadataService } from './services/tool-master-metadata.service';
import { EngineeringMetadataEngine } from './services/engineering-metadata-engine.service';
import { PmmImportService } from './services/pmm-import.service';
import { ToolMasterController } from './controllers/tool-master.controller';
import { PmmImportController } from './controllers/pmm-import.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ToolMaster]), EngineeringFileIndexerModule],
  controllers: [ToolMasterController, PmmImportController],
  providers: [ToolMasterService, ToolMasterMetadataService, EngineeringMetadataEngine, PmmImportService],
  exports: [ToolMasterService, ToolMasterMetadataService, EngineeringMetadataEngine, PmmImportService, TypeOrmModule],
})
export class ToolMasterModule {}
