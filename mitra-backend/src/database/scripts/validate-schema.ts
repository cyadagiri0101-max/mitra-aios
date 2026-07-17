/**
 * Schema drift validator.
 *
 * Compares every TypeORM entity's expected columns (as derived from
 * @Column / relation decorators) against the *actual* columns present in
 * the connected PostgreSQL database (information_schema.columns).
 *
 * This catches the class of bug where an entity class and a migration
 * file have drifted apart — e.g. the entity declares `code` / `isActive`
 * but the migration created `slug` / `status`. A plain "table exists"
 * check (entity count == table count) CANNOT catch this; only a
 * column-level diff can.
 *
 * Run: npm run schema:validate
 * Exit code 0 = no drift. Exit code 1 = drift detected (CI-friendly).
 */
import { AppDataSource } from '../data-source';

interface ColumnDiff {
  table: string;
  entity: string;
  missingInDb: string[]; // entity expects these columns, DB doesn't have them
  extraInDb: string[]; // DB has these columns, entity doesn't reference them
  typeMismatches: { column: string; entityType: string; dbType: string }[];
}

// Map TypeORM "type" strings to the PostgreSQL types we expect to see in
// information_schema.columns.data_type. This is intentionally loose —
// we only flag *clear* mismatches, not every cosmetic difference
// (varchar vs character varying, int vs integer, etc. are normalized).
function normalizeType(t: string | undefined): string {
  if (!t) return 'unknown';
  const s = String(t).toLowerCase();
  const map: Record<string, string> = {
    varchar: 'character varying',
    'character varying': 'character varying',
    string: 'character varying',
    text: 'text',
    int: 'integer',
    integer: 'integer',
    int4: 'integer',
    bigint: 'bigint',
    int8: 'bigint',
    boolean: 'boolean',
    bool: 'boolean',
    uuid: 'uuid',
    jsonb: 'jsonb',
    json: 'json',
    timestamptz: 'timestamp with time zone',
    'timestamp with time zone': 'timestamp with time zone',
    timestamp: 'timestamp without time zone',
    date: 'date',
    numeric: 'numeric',
    decimal: 'numeric',
    float: 'double precision',
    double: 'double precision',
    'double precision': 'double precision',
    real: 'real',
    enum: 'character varying', // TypeORM enums stored as varchar or pg enum; treat varchar as ok
    'enum (pg)': 'user-defined',
    text_array: 'array',
    'simple-array': 'text', // TypeORM default storage for simple-array is a comma-joined text column
    'simple-json': 'text', // TypeORM default storage for simple-json is a JSON-stringified text column
  };
  return map[s] || s;
}

async function main() {
  const ds = await AppDataSource.initialize();

  const dbColumnsByTable = new Map<string, Map<string, string>>();
  const rows: { table_name: string; column_name: string; data_type: string; udt_name: string }[] =
    await ds.query(
      `SELECT table_name, column_name, data_type, udt_name
       FROM information_schema.columns
       WHERE table_schema = 'public'`,
    );
  for (const r of rows) {
    if (!dbColumnsByTable.has(r.table_name)) dbColumnsByTable.set(r.table_name, new Map());
    // udt_name carries the real type for arrays/enums (data_type is often "ARRAY" or "USER-DEFINED")
    const realType =
      r.data_type === 'ARRAY' ? 'array' : r.data_type === 'USER-DEFINED' ? 'user-defined' : r.data_type;
    dbColumnsByTable.get(r.table_name)!.set(r.column_name, realType);
  }

  const diffs: ColumnDiff[] = [];
  const tablesWithEntities = new Set<string>();

  for (const meta of ds.entityMetadatas) {
    const table = meta.tableName;
    tablesWithEntities.add(table);
    const dbCols = dbColumnsByTable.get(table);

    if (!dbCols) {
      diffs.push({
        table,
        entity: meta.name,
        missingInDb: ['<<< TABLE DOES NOT EXIST IN DATABASE >>>'],
        extraInDb: [],
        typeMismatches: [],
      });
      continue;
    }

    const entityColNames = new Set<string>();
    const missingInDb: string[] = [];
    const typeMismatches: { column: string; entityType: string; dbType: string }[] = [];

    for (const col of meta.columns) {
      const dbName = col.databaseName;
      entityColNames.add(dbName);
      if (!dbCols.has(dbName)) {
        missingInDb.push(`${dbName} (${String(col.type)})`);
        continue;
      }
      // Type sanity check (best-effort, skip generated/relation/array edge cases)
      const expected = normalizeType(String(col.type));
      const actual = dbCols.get(dbName)!;
      if (
        expected !== 'unknown' &&
        actual !== expected &&
        !(expected === 'array' && actual === 'array') &&
        !(col.isArray)
      ) {
        // Only report when neither side is a vague/enum/user-defined catch-all
        if (!['user-defined', 'array'].includes(actual) || !['user-defined', 'character varying'].includes(expected)) {
          typeMismatches.push({ column: dbName, entityType: expected, dbType: actual });
        }
      }
    }

    const extraInDb: string[] = [];
    for (const [dbColName] of dbCols) {
      if (!entityColNames.has(dbColName)) extraInDb.push(dbColName);
    }

    if (missingInDb.length || extraInDb.length || typeMismatches.length) {
      diffs.push({ table, entity: meta.name, missingInDb, extraInDb, typeMismatches });
    }
  }

  // Tables that exist in DB but have no corresponding entity at all
  const orphanTables: string[] = [];
  for (const [table] of dbColumnsByTable) {
    if (table === 'typeorm_migrations') continue;
    if (!tablesWithEntities.has(table)) orphanTables.push(table);
  }

  console.log('='.repeat(78));
  console.log('SCHEMA DRIFT REPORT — Entity definitions vs live PostgreSQL schema');
  console.log('='.repeat(78));
  console.log(`Entities checked : ${ds.entityMetadatas.length}`);
  console.log(`Tables in DB     : ${dbColumnsByTable.size} (incl. typeorm_migrations)`);
  console.log(`Tables w/ drift  : ${diffs.length}`);
  console.log(`Orphan DB tables : ${orphanTables.length}`);
  console.log('');

  if (orphanTables.length) {
    console.log('Tables present in DB with no matching @Entity():');
    for (const t of orphanTables) console.log(`  - ${t}`);
    console.log('');
  }

  let criticalCount = 0;
  for (const d of diffs) {
    const isCritical = d.missingInDb.length > 0;
    if (isCritical) criticalCount++;
    console.log(`${isCritical ? '❌ CRITICAL' : '⚠️  WARN    '}  ${d.entity}  →  table "${d.table}"`);
    if (d.missingInDb.length) {
      console.log(`    Entity columns MISSING from DB table (queries WILL fail):`);
      for (const c of d.missingInDb) console.log(`      - ${c}`);
    }
    if (d.extraInDb.length) {
      console.log(`    DB columns not mapped by entity (dead columns / informational):`);
      for (const c of d.extraInDb) console.log(`      - ${c}`);
    }
    if (d.typeMismatches.length) {
      console.log(`    Possible type mismatches:`);
      for (const tm of d.typeMismatches) {
        console.log(`      - ${tm.column}: entity expects "${tm.entityType}", DB has "${tm.dbType}"`);
      }
    }
    console.log('');
  }

  console.log('='.repeat(78));
  if (criticalCount > 0) {
    console.log(`RESULT: ${criticalCount} entity/table pair(s) have columns the entity needs but the`);
    console.log('database does not provide. These WILL throw "column ... does not exist"');
    console.log('at runtime for any query touching those columns.');
  } else if (diffs.length > 0) {
    console.log('RESULT: No missing-column issues. Some informational warnings above');
    console.log('(extra DB columns / type notes) — review but not necessarily blocking.');
  } else {
    console.log('RESULT: ✅ No drift detected. Every entity column has a matching DB column.');
  }
  console.log('='.repeat(78));

  await ds.destroy();
  process.exit(criticalCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Schema validation failed to run:', err);
  process.exit(2);
});
