import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentVersion } from './entities/documentversion.entity';
import { DocumentDownload } from './entities/documentdownload.entity';
import { DocumentVersionService } from './services/documentversion.service';
import { DocumentVersionController } from './controllers/documentversion.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentVersion, DocumentDownload])],
  controllers: [DocumentVersionController],
  providers: [DocumentVersionService],
  exports: [DocumentVersionService, TypeOrmModule],
})
export class DocumentModule {}
