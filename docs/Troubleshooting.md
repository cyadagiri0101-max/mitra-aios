# MITRA AIOS Troubleshooting Guide

## Common Issues

### Installation Issues

#### pip install fails

```bash
# Solution: Upgrade pip and setuptools
pip install --upgrade pip setuptools wheel

# Solution: Clear cache
pip cache purge
pip install -e ".[dev]"
```

#### Python version error

```bash
# Check Python version
python --version

# MITRA requires Python 3.12+
# Install correct version
pyenv install 3.12
pyenv local 3.12
```

### Configuration Issues

#### Config not loading

```bash
# Validate configuration
aios config validate

# Check config file locations
aios config show

# Reset to defaults
aios config reset
```

#### Environment variables not working

```bash
# Check environment variables
echo $AIOS_LOG_LEVEL

# Ensure .env file is loaded
cp .env.example .env
# Edit .env with your settings
```

### Database Issues

#### PostgreSQL connection refused

```bash
# Check if PostgreSQL is running
docker compose -f docker-compose.aios.yml ps postgres

# Check logs
docker compose -f docker-compose.aios.yml logs postgres

# Restart PostgreSQL
docker compose -f docker-compose.aios.yml restart postgres
```

#### Connection pool exhausted

```toml
# Increase pool size in config.toml
[database]
pool_max = 50
pool_min = 5
```

### LLM Issues

#### Ollama connection failed

```bash
# Check if Ollama is running
curl http://localhost:11434/api/version

# Start Ollama
docker compose -f docker-compose.aios.yml up -d ollama

# Pull a model
docker exec ollama ollama pull llama3
```

#### API key invalid

```bash
# Check API key
aios config get llm.api_key

# Set new key
aios config set llm.api_key sk-your-key-here
```

#### Rate limiting errors

```bash
# Check rate limits
aios config get api.rate_limit_rpm

# Increase limit
aios config set api.rate_limit_rpm 120
```

### Memory Issues

#### Out of memory

```bash
# Check memory usage
aios metrics --verbose

# Reduce memory limits
aios config set memory.max_entries 1000

# Clear memory cache
aios memory prune
```

#### Memory retrieval slow

```bash
# Optimize search
aios config set memory.retrieval.method keyword

# Reduce result count
aios memory recall "query" --limit 5
```

### Vector Store Issues

#### FAISS index corrupted

```bash
# Rebuild index
aios state generate --force

# Or delete and rebuild
rm -rf .ai/index/
aios index
```

#### Chroma connection issues

```bash
# Check Chroma service
curl http://localhost:8000/api/v1/vectorstores/providers

# Restart if needed
docker compose restart chroma
```

### API Issues

#### Port already in use

```bash
# Find process using port
netstat -ano | findstr :8000

# Kill process
taskkill /PID <PID> /F

# Or use different port
uvicorn aios.api.app:create_app --factory --port 8001
```

#### CORS errors

```toml
# Update CORS configuration
[api]
cors_origins = "http://localhost:3000,http://localhost:8000"
```

#### WebSocket connection failed

```bash
# Check WebSocket endpoint
curl -i http://localhost:8000/api/v1/ws

# Ensure WebSocket is enabled
aios config get api.websocket_enabled
```

### Docker Issues

#### Container won't start

```bash
# Check container logs
docker compose -f docker-compose.aios.yml logs backend

# Check container status
docker compose -f docker-compose.aios.yml ps

# Rebuild container
docker compose -f docker-compose.aios.yml build --no-cache backend
```

#### Health check failing

```bash
# Check health endpoint
curl http://localhost:8000/api/v1/health

# Check container health
docker inspect --format='{{.State.Health.Status}}' aios-backend
```

### Performance Issues

#### Slow responses

```bash
# Check metrics
aios metrics --verbose

# Enable caching
aios config set llm.cache_enabled true

# Reduce token usage
aios config set llm.max_tokens 2048
```

#### High CPU usage

```bash
# Check running processes
aios metrics --json | jq '.active_executions'

# Reduce concurrency
aios config set scheduler.max_concurrent_jobs 5
```

### Agent Issues

#### Agent not responding

```bash
# Check agent status
aios agent list

# Check agent logs
aios agent info <agent_name>

# Restart agent
aios agent stop <agent_name>
aios agent create --name <agent_name>
```

#### Tool execution timeout

```bash
# Increase timeout
aios config set tools.timeout_seconds 60

# Check tool status
aios tools list
```

### Logging Issues

#### No log output

```bash
# Check log level
aios config get log_level

# Set debug logging
aios config set log_level DEBUG

# Check log file
tail -f logs/aios.log
```

## System Diagnostics

```bash
# Run full diagnostic
aios doctor --verbose

# Check system health
aios health --verbose

# View metrics
aios metrics --json
```

## Getting Help

### Built-in Help

```bash
# Command help
aios --help
aios <command> --help

# API documentation
curl http://localhost:8000/docs
```

### Community Support

- GitHub Issues: https://github.com/mitra-ai/mitra/issues
- Documentation: https://docs.mitra-ai.com
- Discord: https://discord.gg/mitra-ai

### Professional Support

- Email: support@mitra-ai.com
- Enterprise: https://mitra-ai.com/enterprise
