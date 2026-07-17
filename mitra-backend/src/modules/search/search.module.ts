import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchIndex } from './entities/searchindex.entity';
import { SearchIndexService } from './services/searchindex.service';
import { SearchIndexController } from './controllers/searchindex.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SearchIndex])],
  controllers: [SearchIndexController],
  providers: [SearchIndexService],
  exports: [SearchIndexService, TypeOrmModule],
})
export class SearchModule {}
