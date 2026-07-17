# BACKUP AND RECOVERY - MITRA v3.2

**Purpose**: Comprehensive backup and disaster recovery procedures  
**Audience**: System Administrators, DevOps, Site Reliability Engineers  
**Last Updated**: June 24, 2026  
**RTO**: 1-4 hours  
**RPO**: 24 hours

---

## Backup Strategy Overview

MITRA v3.2 uses a multi-layered backup strategy to protect different components:

| Component | Backup Type | Frequency | Retention | Recovery Time |
|-----------|-------------|-----------|-----------|----------------|
| PostgreSQL Database | Full dump + compression | Daily (2 AM UTC) | 30 days | 30 minutes |
| MinIO Objects | Incremental snapshot | Daily (3 AM UTC) | 7 days | 1 hour |
| Application Config | Manual snapshot | On change | 90 days | 5 minutes |
| Ollama Models | Volume snapshot | Weekly | 4 weeks | 15 minutes |
| Redis Cache | Not backed up | N/A | N/A | N/A (regenerable) |

---

## Database Backup

### PostgreSQL Backup Procedure

#### Automated Backup (Recommended)

The project includes automated backup script:

```bash
./scripts/backup-postgres.sh
```

**Script Behavior**:
- Creates: `backup-postgres-$(date +%Y%m%d-%H%M%S).sql.gz`
- Compression: gzip (typically reduces 10GB to 1-2GB)
- Location: Current directory or configured backup path
- Duration: 5-15 minutes depending on database size

**Schedule Automated Backups** (Linux/macOS):

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM UTC
0 2 * * * cd /opt/mitra3.2 && ./scripts/backup-postgres.sh >> /var/log/mitra-backup.log 2>&1

# Add weekly backup to remote storage
0 3 * * 0 cd /opt/mitra3.2 && ./scripts/backup-postgres.sh && \
  aws s3 cp backup-postgres-*.sql.gz s3://mitra-backups/ --delete-local
```

#### Manual Backup

```bash
# Basic backup
podman exec mitra30_postgres_1 pg_dump -U mitra_admin mitra_v2 > backup.sql

# Compressed backup with verbose output
podman exec mitra30_postgres_1 pg_dump -U mitra_admin -v mitra_v2 | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Backup specific table
podman exec mitra30_postgres_1 pg_dump -U mitra_admin -t users mitra_v2 > users-backup.sql

# Backup with custom format (binary, faster restore)
podman exec mitra30_postgres_1 pg_dump -U mitra_admin -Fc mitra_v2 > backup.dump
```

### PostgreSQL Backup Verification

```bash
# Check backup file size
ls -lh backup-*.sql.gz

# Verify backup integrity (test decompress)
gunzip -t backup-postgres-20260624-020000.sql.gz
# Exit code 0 = OK, non-zero = corrupted

# Count records in backup
gunzip -c backup.sql.gz | grep -c "INSERT INTO users"

# Estimate restore time (based on line count)
gunzip -c backup.sql.gz | wc -l  # More lines = longer restore
```

---

## Database Recovery

### Full Database Restore

#### From Compressed Backup

```bash
# Option 1: Direct restore (streaming)
gunzip -c backup-postgres-20260624-020000.sql.gz | \
  podman exec -i mitra30_postgres_1 psql -U mitra_admin mitra_v2

# Option 2: Decompress first, then restore (safer for large files)
gunzip backup-postgres-20260624-020000.sql.gz
podman exec -i mitra30_postgres_1 psql -U mitra_admin mitra_v2 < backup-postgres-20260624-020000.sql

# Option 3: From custom format backup
podman exec -i mitra30_postgres_1 pg_restore -U mitra_admin -d mitra_v2 backup.dump
```

#### Pre-Recovery Checklist

```bash
# 1. Verify backup file exists and is readable
ls -l backup-postgres-*.sql.gz
gunzip -t backup-postgres-*.sql.gz  # Test archive

# 2. Verify database container is running
podman exec mitra30_postgres_1 pg_isready -U mitra_admin

# 3. Stop backend to prevent concurrent writes
podman compose stop backend

# 4. Verify no active connections to target database
podman exec mitra30_postgres_1 psql -U mitra_admin -c \
  "SELECT COUNT(*) FROM pg_stat_activity WHERE datname='mitra_v2';"
# Expected: Should show only system processes (< 5 connections)

# 5. Create fresh database (optional - only if database corrupted)
podman exec mitra30_postgres_1 psql -U mitra_admin -c "DROP DATABASE IF EXISTS mitra_v2_old;"
podman exec mitra30_postgres_1 psql -U mitra_admin -c "ALTER DATABASE mitra_v2 RENAME TO mitra_v2_old;"
podman exec mitra30_postgres_1 psql -U mitra_admin -c "CREATE DATABASE mitra_v2;"
```

#### Recovery Execution

```bash
# Execute restore
echo "Starting restore at $(date)"
gunzip -c backup-postgres-20260624-020000.sql.gz | \
  podman exec -i mitra30_postgres_1 psql -U mitra_admin mitra_v2 2>&1 | \
  tee restore-$(date +%Y%m%d-%H%M%S).log
echo "Restore completed at $(date)"

# Monitor restore progress (in another terminal)
watch -n 5 'podman exec mitra30_postgres_1 psql -U mitra_admin -c "SELECT COUNT(*) FROM users;"'
```

#### Post-Recovery Verification

```bash
# 1. Check for restore errors
grep -i "error\|failed" restore-*.log
# Should be empty (or only warnings about role/permission, which are OK)

# 2. Count records
podman exec mitra30_postgres_1 psql -U mitra_admin mitra_v2 -c \
  "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM projects; SELECT COUNT(*) FROM designs;"

# 3. Verify data integrity
podman exec mitra30_postgres_1 psql -U mitra_admin mitra_v2 -c \
  "SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '1 day';"

# 4. Check for corruption
podman exec mitra30_postgres_1 pg_dump -U mitra_admin mitra_v2 > /dev/null
# If this completes without error, database is OK

# 5. Restart backend
podman compose start backend
```

### Partial Restore (Table-Level)

```bash
# Restore single table
podman exec mitra30_postgres_1 psql -U mitra_admin mitra_v2 -c "DELETE FROM users;"
gunzip -c backup.sql.gz | grep -A 10000 "^COPY users" | \
  podman exec -i mitra30_postgres_1 psql -U mitra_admin mitra_v2
```

---

## Object Storage Backup

### MinIO Backup

#### Automated Backup Script

```bash
# Backup all MinIO objects
aws s3 sync s3://mitra-documents /backup/minio/mitra-documents --recursive

# Or using minio client
mc mirror minio/mitra-documents /backup/minio/mitra-documents

# Scheduled backup (cron)
0 3 * * * mc mirror --watch minio/mitra-documents /backup/minio/mitra-documents
```

#### Manual Backup

```bash
# Export via AWS CLI
podman exec -e AWS_ACCESS_KEY_ID=<KEY> -e AWS_SECRET_ACCESS_KEY=<SECRET> minio-client \
  aws s3 sync s3://mitra-documents ./minio-backup --endpoint-url http://minio:9000

# Export via mc (MinIO client)
podman run --network mitra-internal minio/mc:latest \
  mc mirror minio/mitra-documents /data/backup/
```

---

## Application Configuration Backup

### Configuration Snapshot

```bash
# Backup .env file
cp .env .env.backup-$(date +%Y%m%d-%H%M%S)

# Backup docker-compose.yml
cp docker-compose.yml docker-compose.yml.backup-$(date +%Y%m%d-%H%M%S)

# Backup scripts
tar -czf scripts-backup-$(date +%Y%m%d).tar.gz scripts/

# Store in version control (encrypted)
git add .env.backup-*
git commit -m "Config backup $(date)"
```

---

## Model Storage Backup

### Ollama Models Backup

Models are stored in the `ollama-data` volume. To backup:

```bash
# Create backup of ollama data volume
podman run --rm -v ollama-data:/ollama -v /backup:/backup \
  alpine tar czf /backup/ollama-models-$(date +%Y%m%d).tar.gz -C / ollama

# List backup
ls -lh /backup/ollama-models-*.tar.gz

# Restore ollama models
podman run --rm -v ollama-data:/ollama -v /backup:/backup \
  alpine tar xzf /backup/ollama-models-20260624.tar.gz -C /
```

---

## Disaster Recovery Procedures

### Scenario 1: Database Corruption (Data Accessible)

**Time to Recover**: 30 minutes

```bash
# Step 1: Stop backend
podman compose stop backend

# Step 2: Restore from backup
gunzip -c backup-postgres-latest.sql.gz | \
  podman exec -i mitra30_postgres_1 psql -U mitra_admin mitra_v2

# Step 3: Verify restoration
podman exec mitra30_postgres_1 psql -U mitra_admin mitra_v2 -c \
  "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM projects;"

# Step 4: Restart backend
podman compose up -d backend

# Step 5: Verify API
curl http://localhost:3001/api/health
```

### Scenario 2: Complete Data Loss (Database Down)

**Time to Recover**: 1-2 hours

```bash
# Step 1: Stop all services
podman compose down

# Step 2: Verify backup availability
ls -lh backup-postgres-*.sql.gz
# Must have recent backup (< 24 hours old)

# Step 3: Remove corrupted volumes
podman volume rm mitra30_postgres-data

# Step 4: Start fresh database
podman compose up -d postgres

# Step 5: Wait for database to initialize
sleep 30
podman compose ps postgres | grep healthy

# Step 6: Restore database
gunzip -c backup-postgres-latest.sql.gz | \
  podman exec -i mitra30_postgres_1 psql -U mitra_admin mitra_v2

# Step 7: Restore models (Ollama)
podman run --rm -v ollama-data:/ollama -v /backup:/backup \
  alpine tar xzf /backup/ollama-models-latest.tar.gz -C /

# Step 8: Start all services
podman compose up -d

# Step 9: Verify all services
podman compose ps
curl http://localhost:3001/api/health
curl http://localhost:3001/api/ai/health
```

### Scenario 3: Partial Data Loss (Some Records Deleted)

**Time to Recover**: 15 minutes

```bash
# Step 1: Identify deleted records from audit logs
podman exec mitra30_postgres_1 psql -U mitra_admin mitra_v2 -c \
  "SELECT * FROM audit_logs WHERE action='DELETE' AND created_at > NOW() - INTERVAL '1 hour';"

# Step 2: Check backup for original records
gunzip -c backup-postgres-latest.sql.gz | \
  grep -A 5 "INSERT INTO users VALUES (ID_OF_DELETED_USER)"

# Step 3: Manually restore specific records
# Option A: Use backup to re-insert rows
# Option B: Restore table from backup, then merge data
# Option C: Use point-in-time recovery (if enabled)
```

### Scenario 4: Hardware Failure (New Server)

**Time to Recover**: 2-4 hours

```bash
# Prerequisites: Backup files transferred to new server

# Step 1: Install prerequisites on new server
apt-get update
apt-get install -y podman podman-compose
systemctl start podman

# Step 2: Clone/extract MITRA code
git clone <REPO> /opt/mitra3.2
cd /opt/mitra3.2

# Step 3: Copy backup files to new location
cp /backups/backup-postgres-latest.sql.gz .
cp /backups/ollama-models-latest.tar.gz .

# Step 4: Run initialization
./scripts/podman-setup.sh

# Step 5: Start services (database only)
podman compose up -d postgres

# Step 6: Restore database
gunzip -c backup-postgres-latest.sql.gz | \
  podman exec -i mitra30_postgres_1 psql -U mitra_admin mitra_v2

# Step 7: Restore models
podman run --rm -v ollama-data:/ollama -v .:/backup \
  alpine tar xzf /backup/ollama-models-latest.tar.gz -C /

# Step 8: Start all services
podman compose up -d

# Step 9: Verify
curl http://localhost:3001/api/health
```

---

## Backup Best Practices

### Daily Backup Checklist

- [ ] Backup completes without errors
- [ ] Backup file size is reasonable (not 0 bytes)
- [ ] Backup file is compressed (ends in .gz)
- [ ] Backup file can be decompressed (test: `gunzip -t`)
- [ ] Timestamp on backup file is recent (today)

### Monthly Recovery Test

- [ ] Restore to test database
- [ ] Verify data integrity (record counts, checksums)
- [ ] Document restore time
- [ ] Update recovery procedures if needed

### Backup Storage

**Local Storage**:
- Location: `/backups/mitra/`
- Retention: 30 days (oldest deleted automatically)
- Access: Only root and backup user

**Remote Storage** (Recommended):
- Service: AWS S3, Azure Blob, or equivalent
- Bucket: `mitra-v3-backups`
- Encryption: AES-256
- Redundancy: Geographically distributed

**Hybrid Strategy**:
- Daily local backup (fast recovery)
- Weekly remote backup (long-term retention, disaster recovery)

---

## Backup Monitoring

### Backup Success Verification

```bash
# Check last backup time
ls -lt backup-postgres-*.sql.gz | head -1

# Should be within 24 hours
find backup-postgres-*.sql.gz -mtime +1 -print
# No output = good (backup is < 24 hours old)

# Automated check (cron)
0 8 * * * test -f backup-postgres-*.sql.gz -mtime 0 || echo "BACKUP MISSING: $(date)" | mail -s "ALERT: MITRA Backup Failed" admin@company.com
```

### Alert Configuration

```bash
# Alert if backup fails
if [ ! -f backup-postgres-*.sql.gz ]; then
  send_alert "CRITICAL: Database backup missing"
  exit 1
fi

# Alert if backup too old
BACKUP_AGE=$(( $(date +%s) - $(stat -c %Y backup-postgres-latest.sql.gz) ))
BACKUP_AGE_HOURS=$(( BACKUP_AGE / 3600 ))

if [ $BACKUP_AGE_HOURS -gt 24 ]; then
  send_alert "WARNING: Database backup is ${BACKUP_AGE_HOURS} hours old"
fi
```

---

## Recovery Testing Schedule

| Frequency | Type | Scope | Owner |
|-----------|------|-------|-------|
| Daily | Automated | Backup integrity test | Backup script |
| Weekly | Manual | Restore to test database | DevOps |
| Monthly | Full | Complete system recovery | SRE |
| Quarterly | Audit | Review procedures, update docs | Team Lead |

---

## Documentation & Logs

### Backup Logs Location

```
/var/log/mitra-backup.log          # Automated backup logs
/var/log/mitra-restore.log         # Restore operation logs
./backup-logs/                      # Per-backup detailed logs
```

### Log Retention

- Backup logs: 90 days
- Restore logs: 180 days
- Audit logs (database): 365 days

---

## Recovery Time & Point Objectives

| Scenario | RTO | RPO | Notes |
|----------|-----|-----|-------|
| Database unavailable | 30 min | 24 hours | Full restore from backup |
| Corrupted data | 45 min | 24 hours | Restore + verify |
| Hardware failure | 2-4 hours | 24 hours | Provision + restore |
| Partial data loss | 15 min | Varies | Point-in-time recovery |
| Cache loss | 5 min | 0 hours | Auto-rebuilt on access |

---

**End of Backup and Recovery**
