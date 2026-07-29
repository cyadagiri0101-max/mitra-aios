# MITRA Migration Guide

## Purpose

This document explains how to manage database schema migrations for the MITRA backend and preserve a stable release baseline.

## Migration Strategy

The MITRA backend uses TypeORM migrations for schema changes. Migrations are stored in `mitra-backend/src/database/migrations/`.

### Migration workflow

1. Create a new migration after changing entities:

```bash
cd mitra-backend
npm run typeorm migration:generate -- -n <MigrationName>
```

2. Review the generated migration file for correctness.
3. Run migrations against the target database:

```bash
npm run typeorm migration:run
```

4. Commit the migration file alongside code changes.

## Release Baseline Requirements

- Do not modify existing migration history for a released baseline.
- New migrations should only be added for new schema changes.
- Before Sprint 2 feature work, verify `mitra-backend/src/database/migrations/` contains the complete chain and no pending schema drift exists.

## Verifying Migrations

Run:

```bash
cd mitra-backend
npm run typeorm migration:show
```

A clean baseline should show all existing migrations and no pending migration when the database is current.

## Notes

- If the application uses `synchronize: true` in development, ensure production databases still use migrations.
- Keep migration naming consistent with `YYYYMMDDHHmmss-Description.ts`.
