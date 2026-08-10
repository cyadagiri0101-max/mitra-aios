# Schema Integrity Investigation

## Summary

- `SchemaIntegrityService` is the boot-time validator used by the NestJS app.
- It checks a fixed set of required entity columns in the database.
- It throws only when one or more configured columns are present in the entity metadata but missing from `information_schema.columns`.
- The exact failure condition is:
  - `throw new Error('[MITRA] Schema integrity check FAILED — missing columns: ' + ...);`

## Required columns checked by `SchemaIntegrityService`

- `audit_logs.event_type`
- `workflow_instances.version`
- `workflow_transitions.required_roles`
- `workflow_transitions.required_permissions`
- `workflow_transitions.requires_approval`
- `rfqs.version`
- `quotations.version`
- `leads.version`
- `customers.version`

## Current validation result

I ran `npm run schema:validate` against the current `mitra_v2_test` database using the same workspace environment.

Output summary:

- Entities checked: `173`
- Tables in DB: `173` (including `typeorm_migrations`)
- Tables with drift: `3`
- Orphan DB tables: `0`
- Result: `No missing-column issues`

The only drift reported was informational:

- `ToolMaster` / table `tool_master`
  - DB columns not mapped by entity: `tool_no`, `mold_base_cost`, `total_cost`, `wooden_box_cost`, `std_part_cost`, `inserts_cost`, `fasteners_cost`, `elec_cost`, `mask_parts_cost`, `alpla_std_parts_cost`
- `ProjectFolder` / table `project_folders`
  - DB columns not mapped by entity: `total_size_bytes`, `is_watched`, `file_count`, `last_scanned_at`, `folder_type`, `minio_prefix`
- `ProjectFolder` / table `project_folders`
  - DB columns not mapped by entity: `is_default`, `parent_folder_id`, `sequence`

These warnings do not trigger `SchemaIntegrityService` failure because they are extra DB columns, not missing required columns.

## Migration tracking logic

- `src/database/data-source.ts` configures TypeORM with:
  - `migrations: [join(__dirname, 'migrations/*{.ts,.js}')]`
  - `migrationsTableName: 'typeorm_migrations'`
- `test/setup-test-db.sh` runs:
  - `npm run migration:run -d src/database/data-source.ts`
  - then `npm run schema:validate`

So the E2E setup path is:

1. create/drop `mitra_v2_test`
2. run migrations
3. run schema drift validation
4. seed reference data

## Key finding

- There is no evidence of a live schema integrity assertion failure in the current `mitra_v2_test` database.
- The current schema drift output shows only extra columns, not missing ones.
- Therefore the failure, if present, is likely:
  1. from a different database instance/environment than the one validated here, or
  2. from an older/stale migration state, or
  3. from a different check than `SchemaIntegrityService`.

## Next step

- Reproduce the boot failure with the same DB configuration and capture the exact error message.
- Confirm the application is connecting to the same `mitra_v2_test` database that `schema:validate` was run against.
- If boot failure occurs, compare the failing table/column against the fixed list in `SchemaIntegrityService.REQUIRED_COLUMNS`.
