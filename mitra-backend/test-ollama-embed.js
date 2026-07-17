const { OllamaProvider } = require('/app/dist/modules/ai/providers/ollama.provider.js');

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
  const config = new FakeConfigService();
  const ollama = new OllamaProvider(config);
  console.log('enabled:', ollama.enabled);
  console.log('url:', ollama.url);
  console.log('model:', ollama.model);
  
  const result = await ollama.embed('test embedding', 'nomic-embed-text');
  console.log('embed result type:', typeof result);
  console.log('embed result is array:', Array.isArray(result));
  console.log('embed result length:', result ? result.length : 0);
  console.log('first 5:', result ? result.slice(0, 5) : null);
}

main().catch(e => { console.error(e); process.exit(1); });
