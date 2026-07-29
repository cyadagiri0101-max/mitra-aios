# AIOS Configuration Guide

## Overview

AIOS uses a layered configuration model:
- **CLI flags** override all other sources
- **Environment variables** (prefixed with `AIOS_`)
- **Configuration file** (`.ai/config.yaml` or custom path)
- **Sane defaults** for every setting

---

## Core Configuration

| Setting | Env Variable | CLI Flag | Default | Description |
|---------|-------------|----------|---------|-------------|
| Repo root | `AIOS_ROOT` | `--root` / `-r` | `.` | Repository root path |
| Operating mode | `AIOS_MODE` | `--mode` / `-m` | `standard` | `standard`, `debug`, `production` |
| Log level | `AIOS_LOG_LEVEL` | `--log-level` / `-l` | `INFO` | `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| Database path | `AIOS_DB_PATH` | — | `aios_persistence.db` | SQLite file path |
| EOS directory | `AIOS_EOS_DIR` | — | `.ai` | Engineering Operating System root |

---

## Security Configuration

| Setting | Env Variable | Default | Description |
|---------|-------------|---------|-------------|
| Auth enabled | `AIOS_AUTH_ENABLED` | `true` | Enable API authentication |
| Encryption key | `AIOS_ENCRYPTION_KEY` | auto-generated | AES-256-GCM hex key (64 hex chars) |

---

## API Configuration

| Setting | Env Variable | Default | Description |
|---------|-------------|---------|-------------|
| API host | `AIOS_API_HOST` | `0.0.0.0` | Bind address |
| API port | `AIOS_API_PORT` | `8000` | Listen port |
| CORS origins | `AIOS_CORS_ORIGINS` | `*` | Comma-separated allowed origins |

---

## Memory Configuration

| Setting | Env Variable | Default | Description |
|---------|-------------|---------|-------------|
| Working capacity | `AIOS_WORKING_CAPACITY` | `100` | Max working memory entries |
| Working TTL | `AIOS_WORKING_TTL` | `3600` | Working entry time-to-live (seconds) |
| Dedup threshold | `AIOS_DEDUP_THRESHOLD` | `0.85` | Similarity threshold for deduplication |
| Snapshot dir | `AIOS_SNAPSHOT_DIR` | `.ai/runtime/snapshots` | Memory snapshot directory |

---

## Engine Configuration

| Setting | Env Variable | Default | Description |
|---------|-------------|---------|-------------|
| Max retries | `AIOS_MAX_RETRIES` | `3` | Execution retry limit |
| Retry delay | `AIOS_RETRY_DELAY` | `1.0` | Base delay between retries (seconds) |
| Backoff multiplier | `AIOS_BACKOFF_MULTIPLIER` | `2.0` | Exponential backoff factor |
| Context budget | `AIOS_CONTEXT_BUDGET` | `100` | Max context items per execution |

---

## Example Configuration File

Place at `.ai/config.yaml` or in the repo root:

```yaml
aios:
  mode: production
  log_level: INFO
  db_path: /data/aios.db
  api:
    host: 0.0.0.0
    port: 8000
    cors_origins: "https://app.example.com"
  security:
    auth_enabled: true
    encryption_key: "" # auto-generated if empty
  memory:
    working_capacity: 200
    working_ttl: 7200
    dedup_threshold: 0.9
  engine:
    max_retries: 5
    retry_delay: 2.0
    backoff_multiplier: 1.5
```
