import { DataSource } from 'typeorm';

async function main() {
  const dbs = ['mitra_v2', 'mitra_v2_test'];
  for (const db of dbs) {
    const ds = new DataSource({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: db,
    });
    try {
      await ds.initialize();
      await ds.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mitra_admin;`);
      await ds.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mitra_admin;`);
      await ds.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mitra_admin;`);
      await ds.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mitra_admin;`);
      console.log(`✓ Granted all privileges to mitra_admin on ${db}`);
      await ds.destroy();
    } catch (e) {
      console.error(`Error granting on ${db}:`, e);
    }
  }
}

main();
