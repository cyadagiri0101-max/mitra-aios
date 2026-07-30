# F1 Verification Report

**Date:** 2026-07-30
**Verification Engineer:** Release Automation

---

## Result: ✅ TRUE (real bug confirmed and fixed)

### Bug Confirmation

**Finding:** Migration `1700000000010-PermissionSeed.ts` references `security.roles`, `security.permissions`, and `security.role_permissions` using the `security.` schema prefix.

**Evidence:**

1. The `security` schema is never created in any migration (no `CREATE SCHEMA IF NOT EXISTS security` exists in executable code).
2. InitialSchema migration (`1700000000000`) creates `"roles"`, `"permissions"`, `"role_permissions"` without schema prefix → these land in `public` schema.
3. TypeORM entity decorators specify `@Entity('roles')`, `@Entity('permissions')`, `@Entity('role_permissions')` without schema → mapped to `public` schema.
4. All other migrations (0000-0009) operate without schema prefix.
5. Running `npm run migration:run` from scratch would fail at migration 0010 with `ERROR: schema "security" does not exist`.

### Fix Applied

All `security.` schema prefixes removed from migration 0010:

| File | Lines changed |
|------|---------------|
| `mitra-backend/src/database/migrations/1700000000010-PermissionSeed.ts` | 7 occurrences |

The SQL now references `roles`, `permissions`, `role_permissions` directly, matching the `public` schema used by all other migrations and entities.

### Verification

```bash
# Confirm no remaining security. references
grep -rn "security\\." src/database/migrations/1700000000010-PermissionSeed.ts
# → (empty, no matches)
```
