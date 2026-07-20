# MITRA AIOS — AI Operating System

**Version:** 1.2.0rc2 (EOS Convergence Release Candidate)

AIOS is the AI Operating System runtime powering the MITRA Software Verification Framework (SVF). It provides the execution engine, scheduling, memory, agent coordination, RAG, and real-time communication layers for autonomous verification workflows.

## Quick Start

```bash
# Install from wheel
pip install dist/aios-1.2.0rc2-py3-none-any.whl

# Verify installation
aios --version
aios --help

# Scan a repository
cd your-project
aios scan
aios index
```

## Requirements

- Python >= 3.13
- Runtime dependencies: PyYAML, typer, fastapi, pydantic, uvicorn, websockets

## CLI Overview

AIOS provides 21 commands covering the full system lifecycle:

| Command      | Description |
|-------------|-------------|
| `scan`      | Scan the repository and produce scan.json |
| `index`     | Build indexes from scan results |
| `state`     | Manage persistence state via EOS PersistenceStore |
| `context`   | Build execution context for a task |
| `checkpoint`| Manage persistence checkpoints |
| `run`       | Run the full autonomous workflow |
| `execute`   | Execute an EOS workflow through the pipeline |
| `report`    | Generate observability reports |
| `metrics`   | Collect and display runtime metrics |
| `memory`    | Manage long-term and short-term memories |
| `decision`  | Evaluate execution paths and make decisions |
| `validate`  | Validate all EOS components against repository evidence |
| `health`    | Check system health status |
| `doctor`    | Run comprehensive system diagnostics |
| `recover`   | Recover system state from a memory snapshot |
| `chat`      | Chat with an AI agent |
| `workflow`  | Manage multi-agent workflows |
| `tools`     | List, inspect, and run registered tools |
| `plugins`   | Manage AIOS plugins |
| `agent`     | Manage AI agents |
| `config`    | View and manage AIOS configuration |

## Documentation

- [CLI Reference](docs/CLI.md) — Full command reference with examples
- [API Documentation](docs/API.md) — REST API routes and schemas
- [Developer Guide](docs/DeveloperGuide.md) — Building, testing, and contributing
- [Configuration Guide](docs/ConfigurationGuide.md) — All configuration options
- [Architecture](docs/Architecture.md) — System architecture and component design
- [Release Notes](docs/ReleaseNotes.md) — Version history and upgrade notes
- [Security Review](FINAL_SECURITY_REPORT.md) — Security audit findings

## Development

```bash
# Clone and install with dev dependencies
git clone https://github.com/anomalyco/mitra-aios.git
cd mitra-aios
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"

# Run tests
pytest

# Build distribution
python -m build
```

## Project Structure

```
src/aios/
  cli/         — CLI application and 21 command modules
  api/         — FastAPI REST API with 15 route modules
  eos/         — Execution-Oriented System core engine
  security/    — Authentication, authorization, encryption
  config/      — Configuration loading and management
  agent/       — AI agent management and coordination
  tools/       — Tool execution and sandbox
  llm/         — LLM provider abstraction (7 providers)
  embedding/   — Embedding provider abstraction (6 providers)
  memory/      — Memory systems (working, episodic, semantic)
  rag/         — Retrieval-Augmented Generation
  scheduler/   — Job scheduling and queue management
  multiagent/  — Multi-agent coordination and consensus
  observability/ — Health, metrics, tracing, audit
  plugins/     — Plugin system (indexer, scanner)
  repository/  — File scanning and indexing
  vectorstore/ — Vector store abstraction (7 providers)
```

## License

MIT — see [LICENSE](LICENSE).
