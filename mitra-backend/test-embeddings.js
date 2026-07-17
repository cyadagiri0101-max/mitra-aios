const { AppDataSource } = require('/app/dist/database/data-source.js');
const { OllamaProvider } = require('/app/dist/modules/ai/providers/ollama.provider.js');
const { EmbeddingService } = require('/app/dist/modules/ai/services/embedding.service.js');
const { VectorSearchService } = require('/app/dist/modules/ai/services/vector-search.service.js');
const { KnowledgeEmbedding, EmbeddingEntityType } = require('/app/dist/modules/ai/entities/knowledge-embedding.entity.js');

class FakeConfigService {
  get(key, defaultValue) {
    const env = {
      AI_ENABLED: 'true',
      OLLAMA_MODEL: 'phi3',
      OLLAMA_URL: 'http://ollama:11434',
      OLLAMA_TIMEOUT_MS: '45000',
    };
    return env[key] !== undefined ? env[key] : defaultValue;
  }
}

async function main() {
  try {
    await AppDataSource.initialize();
    console.log('✓ Database connected');

    const config = new FakeConfigService();
    const ollama = new OllamaProvider(config);
    const repo = AppDataSource.getRepository(KnowledgeEmbedding);
    const embeddingService = new EmbeddingService(ollama, repo);
    const vectorSearch = new VectorSearchService(embeddingService, AppDataSource.manager);

    const tenantId = 'a69c523f-cf9a-4de7-b39f-404def9cc724';
    const entityId = '00000000-0000-0000-0000-000000000001';
    const content = 'Test knowledge article about injection molding flash defects';

    console.log('Testing EmbeddingService.upsertEmbedding...');
    const record = await embeddingService.upsertEmbedding({
      entityType: EmbeddingEntityType.KNOWLEDGE,
      entityId,
      content,
      tenantId,
      metadata: { article_type: 'TEST' },
    });
    console.log('✓ Embedding upserted:', record.id);
    console.log('  Vector length:', record.embedding ? record.embedding.length : 0);
    console.log('  Model:', record.modelName);

    console.log('Testing VectorSearchService.search...');
    const results = await vectorSearch.search('injection molding defects', tenantId, [EmbeddingEntityType.KNOWLEDGE], 5);
    console.log('✓ Vector search returned', results.length, 'results');
    results.forEach(r => {
      console.log('  -', r.entityType, r.entityId, 'similarity:', r.similarity);
    });

    // Cleanup test record
    await repo.delete({ id: record.id });
    console.log('✓ Test record cleaned up');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (err) {
    console.error('FAILED:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
