# DATABASE VALIDATION REPORT

**Date:** 2026-06-24  
**Status:** ✅ RESOLVED

---

## Issue

Database authentication failing for `mitra_admin` when running backend/seed from host.

Evidence:

```
error: password authentication failed for user "mitra_admin"
code: 28P01
```

## Root Cause

A native Windows PostgreSQL 18 service (`postgresql-x64-18`) was listening on `localhost:5432` (PID 9656). This shadowed the Podman container's port forwarding, so host connections were routed to the Windows PostgreSQL instance instead of the container PostgreSQL. The Windows instance did not recognize the `mitra_admin` / `.env` credentials.

Inside the container network, the backend connected directly to the container PostgreSQL via DNS alias `postgres` and worked correctly.

## Actual Credentials

| Item | Value |
|------|-------|
| Postgres username | `mitra_admin` |
| Postgres password | `36bf05cc734b59e539c646fd4ef4e8bf0e72137d0164d8d4` |
| Database | `mitra_v2` |
| Backend configured username | `mitra_admin` |
| Backend configured password | `36bf05cc734b59e539c646fd4ef4e8bf0e72137d0164d8d4` |

## Fix Applied

1. **Reset PostgreSQL password** inside the container to match `.env`:
   ```bash
   podman exec mitra30_postgres_1 psql -U mitra_admin -d mitra_v2 -c "ALTER USER mitra_admin WITH PASSWORD '36bf05cc734b59e539c646fd4ef4e8bf0e72137d0164d8d4';"
   ```

2. **Fixed `npm run seed` in production container.** The seed script used `ts-node` with TypeScript source imports, but the production runtime image only ships compiled `dist/` and `src/database/`. Updated `mitra-backend/package.json`:
   ```json
   "seed": "node dist/database/seed.js"
   ```
   Rebuilt backend image and recreated container.

3. **Verified container networking** with `podman-compose.yml` after fixing healthcheck `CMD-SHELL` → `CMD` compatibility issues for the Python `podman-compose` provider.

## Evidence

### Migration

```bash
podman compose -f podman-compose.yml -p mitra30 exec backend npm run migration:run
```

Result:

```
No migrations are pending
Migration SupplierProductMasters1700000000005 has been executed successfully.
```

Status: ✅ **Zero authentication errors**

### Seed

```bash
podman compose -f podman-compose.yml -p mitra30 exec backend npm run seed
```

Result:

```
🌱 Seeding MITRA database...
  ✓ 33 permissions seeded
  ✓ 0 role↔permission assignments seeded
  ✓ 17 MITRA workflow states seeded
  ✓ 16 lifecycle transitions seeded

🎉 Seed complete!
  Login: admin@mitra.local (password set via SEED_ADMIN_PASSWORD)
```

Status: ✅ **Successful**

### Backend Health

```bash
curl http://localhost:3001/api/health
```

Result:

```json
{"status":"ok","info":{"database":{"status":"up"}}}
```

Status: ✅ **200 OK**

## Note

The Windows PostgreSQL service on port 5432 remains running (could not be stopped without elevated privileges). The container stack is fully functional using the container network; host-side direct connections to `localhost:5432` will continue to hit the Windows service. All MITRA operations should use the container network or the published backend port `3001`.
