import { DataSource } from 'typeorm';
// pg 8.x supports PostgreSQL 12–18+. No driver changes required for PG18.
// TypeORM 0.3.x is tested with PG 12–17; all SQL used by MITRA (UUID, JSONB,
// TIMESTAMPTZ, soft deletes) is identical on PG18.
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * TypeORM CLI data source.
 * Used by: migration:generate, migration:run, migration:revert
 *
 * Requires .env to be present — copy .env.example and fill in values.
 */

const username = process.env.DB_USERNAME;
const database = process.env.DB_NAME;
const password = process.env.DB_PASSWORD;

if (!username || !database) {
  process.stderr.write(
    '\n[data-source] WARNING: DB_USERNAME or DB_NAME not set in .env.' +
    ' Falling back to mitra_admin / mitra_v2.\n' +
    ' Copy .env.example → .env and set all DB_* variables.\n\n',
  );
}

if (!password) {
  process.stderr.write(
    '\n[data-source] ERROR: DB_PASSWORD not set in .env. Migrations will fail.\n\n',
  );
}

export const AppDataSource = new DataSource({
  type:     'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  username: username                 || 'mitra_admin',
  password: password,
  database: database                 || 'mitra_v2',
  synchronize: false,
  logging:     false,
  entities:    [
    join(__dirname, '../modules/**/*.entity{.ts,.js}'),
    join(__dirname, '../modules/audit/**/*.entity{.ts,.js}'),
  ],
  migrations:         [join(__dirname, 'migrations/*{.ts,.js}')],
  migrationsTableName: 'typeorm_migrations',
});
