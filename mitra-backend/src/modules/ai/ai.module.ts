import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OllamaProvider }      from './providers/ollama.provider';
import { AiContextService }    from './services/ai-context.service';
import { AiService }           from './services/ai.service';
import { EmbeddingService }    from './services/embedding.service';
import { VectorSearchService } from './services/vector-search.service';
import { AiController }        from './controllers/ai.controller';
import { KnowledgeEmbedding }  from './entities/knowledge-embedding.entity';
import { AiConversation }      from './entities/ai-conversation.entity';
import { AiMessage }           from './entities/ai-message.entity';
import { AiUsageModule }       from '@modules/ai-usage/ai-usage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([KnowledgeEmbedding, AiConversation, AiMessage]),
    AiUsageModule,
  ],
  controllers: [AiController],
  providers:   [
    OllamaProvider,
    AiContextService,
    AiService,
    EmbeddingService,
    VectorSearchService,
  ],
  exports: [AiService, VectorSearchService, EmbeddingService],
})
export class AiModule {}
