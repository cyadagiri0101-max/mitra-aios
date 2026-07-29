# AIOS Operations Guide

## Monitoring

### Health Endpoints

Every EOS module exposes a `health()` method returning `HealthStatus`:

```
GET /api/v1/health          → Overall system health
GET /api/v1/health/memory   → MemoryManager health
GET /api/v1/health/runtime  → RuntimeEngine health
GET /api/v1/health/events   → EventBus health
GET /api/v1/health/workflow → WorkflowEngine health
```

### CLI Health Check

```bash
aios health          # Quick overview
aios doctor          # Deep diagnostic
aios metrics         # Runtime metrics
```

### Key Metrics

- **Event bus error rate** — healthy if < 5%
- **Memory retrieval latency** — healthy if < 10s average
- **Execution failure rate** — healthy if < 10%
- **Database integrity** — checked via `PRAGMA integrity_check`
- **EOS loader status** — kernel docs loaded, registries indexed

---

## Rollback Plan

### Code Rollback

```bash
git revert --no-commit HEAD
git commit -m "Rollback: revert to previous stable version"
```

### Data Rollback

MemoryManager supports snapshot-based rollback:

```python
from aios.eos.memory_manager import MemoryManager
mm = MemoryManager()
mm.initialize()

# Create snapshot before upgrade
snap = mm.snapshot(label="pre-upgrade-v1.2.0-rc2")

# If needed, restore from snapshot
mm.restore(snap["snapshot_id"])
```

### Database Rollback

SQLite backups are taken automatically on schema migrations.
Manual backup:

```bash
cp aios_persistence.db aios_persistence.db.bak.$(date +%Y%m%d)
```

---

## Backup Procedures

### Automated Backup (recommended)

Add to crontab or Task Scheduler:

```bash
#!/bin/bash
BACKUP_DIR="/data/backups/aios"
mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
cp aios_persistence.db "$BACKUP_DIR/aios_db_$DATE.db"

# Backup memory snapshots
tar -czf "$BACKUP_DIR/aios_snapshots_$DATE.tar.gz" .ai/runtime/snapshots/

# Backup EOS configuration
tar -czf "$BACKUP_DIR/aios_eos_$DATE.tar.gz" .ai/

# Keep only last 30 days
find "$BACKUP_DIR" -name "aios_*.db" -mtime +30 -delete
find "$BACKUP_DIR" -name "aios_*.tar.gz" -mtime +30 -delete
```

### Manual Backup

```bash
python -c "
from aios.eos.memory_manager import MemoryManager
mm = MemoryManager()
mm.initialize()
result = mm.snapshot(label='manual-backup')
print(f'Snapshot: {result[\"snapshot_id\"]}')
"
```

---

## Disaster Recovery

### Full Recovery Procedure

1. **Stop services:** `docker compose -f docker-compose.aios.yml down`
2. **Restore database:** Copy backup `.db` file to working directory
3. **Restore snapshots:** Extract `.tar.gz` snapshot archive
4. **Restore EOS:** Extract EOS `.tar.gz` archive
5. **Restart services:** `docker compose -f docker-compose.aios.yml up -d`
6. **Verify health:** `aios health`

### Data Integrity Verification

```bash
aios validate              # Validate all subsystems
aios doctor                # Deep diagnostic
python -c "
from aios.eos.memory_manager import MemoryManager
mm = MemoryManager()
mm.initialize()
result = mm.validate()
print(f'Memory validation: valid={result.is_valid}')
"
```
