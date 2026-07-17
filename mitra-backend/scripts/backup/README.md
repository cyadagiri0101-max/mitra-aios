# MITRA v3.2 Backup Scripts

This directory contains automated backup and restore scripts for MITRA v3.2.

## Scripts

| Script | Purpose |
|--------|---------|
| `backup-postgres.sh` | Daily PostgreSQL dump (timestamped + gzip) with optional MinIO upload |
| `backup-minio.sh` | Mirror MinIO documents bucket to backup location |
| `restore-postgres.sh` | Restore database from a `.sql.gz` dump file |
| `verify-backup.sh` | Test-restore latest backup to temp DB and verify table integrity |

## Quick Start

```bash
# Make scripts executable
chmod +x scripts/backup/*.sh

# Run individual backups
./scripts/backup/backup-postgres.sh
./scripts/backup/backup-minio.sh

# Verify latest backup integrity
./scripts/backup/verify-backup.sh

# Restore from a specific backup
./scripts/backup/restore-postgres.sh backups/db/mitra_mitra_v2_20250115_020000.sql.gz
```

## Environment Variables

All scripts read from `.env` in the backend root. Required variables:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mitra_v2
DB_USERNAME=mitra_admin
DB_PASSWORD=your_password
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_BACKUP_BUCKET=mitra-backups
BACKUP_DIR=./backups
```

## Cron Schedule

### Host-level cron (recommended for production)

```bash
# Edit crontab
crontab -e

# Daily at 2:00 AM — full backup
0 2 * * * cd /path/to/mitra-backend && ./scripts/backup/backup-postgres.sh >> /var/log/mitra-backup.log 2>&1
0 2 * * * cd /path/to/mitra-backend && ./scripts/backup/backup-minio.sh >> /var/log/mitra-backup.log 2>&1

# Weekly at 3:00 AM — verify backup integrity
0 3 * * 0 cd /path/to/mitra-backend && ./scripts/backup/verify-backup.sh >> /var/log/mitra-backup.log 2>&1
```

### Docker Compose (see `docker-compose.backup.yml`)

A dedicated backup container runs the scripts on schedule without requiring host-level cron.

## Retention Policy

- Database dumps: 30 days (auto-deleted by `backup-postgres.sh`)
- MinIO mirrors: 30 days (auto-deleted by `backup-minio.sh`)
- Adjust by changing the `-mtime +30` value in the scripts.

## Restore Checklist

1. Stop the backend container: `docker compose stop backend`
2. Run restore: `./scripts/backup/restore-postgres.sh <path-to-dump>`
3. Start backend: `docker compose start backend`
4. Verify: `docker compose exec backend npm run migration:show`
5. Verify: `curl http://localhost:3001/api/health`

## Disaster Recovery

See `DEPLOYMENT.md` for full disaster recovery procedures including full server rebuilds.
