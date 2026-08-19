import { DataSource } from 'typeorm';
import { M2DesignLoadFoundation1700000000038 } from '../migrations/1700000000038-M2DesignLoadFoundation';

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: 'mitra_v2_test',
  });

  await ds.initialize();
  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();

  const migration = new M2DesignLoadFoundation1700000000038();
  try {
    await migration.up(queryRunner);
    console.log('✓ Migration 0038 executed on mitra_v2_test');
  } catch (err: any) {
    console.log('Note on migration 0038:', err?.message);
  } finally {
    await queryRunner.release();
    await ds.destroy();
  }
}

main();
