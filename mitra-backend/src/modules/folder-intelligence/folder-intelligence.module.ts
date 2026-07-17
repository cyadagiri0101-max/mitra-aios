import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FolderScanJob } from './entities/folderscanjob.entity';
import { FolderScanResult } from './entities/folderscanresult.entity';
import { ProjectFolder } from './entities/projectfolder.entity';
import { FileClassificationRule } from './entities/fileclassificationrule.entity';
import { FileRelationship } from './entities/filerelationship.entity';
import { FolderScanJobService } from './services/folderscanjob.service';
import { FolderScanJobController } from './controllers/folderscanjob.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FolderScanJob, FolderScanResult, ProjectFolder, FileClassificationRule, FileRelationship])],
  controllers: [FolderScanJobController],
  providers: [FolderScanJobService],
  exports: [FolderScanJobService, TypeOrmModule],
})
export class FolderIntelligenceModule {}
