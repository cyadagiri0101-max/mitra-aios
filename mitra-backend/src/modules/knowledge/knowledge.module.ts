import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeArticle } from './entities/knowledgearticle.entity';
import { KnowledgeAttachment } from './entities/knowledgeattachment.entity';
import { KnowledgeCategory } from './entities/knowledgecategory.entity';
import { KnowledgeTag } from './entities/knowledgetag.entity';
import { KnowledgeArticleService } from './services/knowledgearticle.service';
import { KnowledgeArticleController } from './controllers/knowledgearticle.controller';

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeArticle, KnowledgeAttachment, KnowledgeCategory, KnowledgeTag])],
  controllers: [KnowledgeArticleController],
  providers: [KnowledgeArticleService],
  exports: [KnowledgeArticleService, TypeOrmModule],
})
export class KnowledgeModule {}
