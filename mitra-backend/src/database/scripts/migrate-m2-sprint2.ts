import { DataSource } from 'typeorm';
import { M2Sprint2BaselinesCapacity1700000000039 } from '../migrations/1700000000039-M2Sprint2BaselinesCapacity';

async function migrateDb(dbName: string) {
  const ds = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: dbName,
  });

  await ds.initialize();
  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();

  const migration = new M2Sprint2BaselinesCapacity1700000000039();
  try {
    await migration.up(queryRunner);
    console.log(`✓ Migration 0039 executed on ${dbName}`);
  } catch (err: any) {
    console.log(`Note on migration 0039 for ${dbName}:`, err?.message);
  }

  try {
    await queryRunner.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mitra_admin;`);
    await queryRunner.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mitra_admin;`);
    console.log(`✓ Grants updated for mitra_admin on ${dbName}`);
  } catch (e: any) {
    console.log(`Grants note on ${dbName}:`, e?.message);
  } finally {
    await queryRunner.release();
    await ds.destroy();
  }
}

async function main() {
  await migrateDb('mitra_v2');
  await migrateDb('mitra_v2_test');
}

main();
