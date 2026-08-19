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
      await ds.query(`
        INSERT INTO "role_permissions" ("role_id", "permission_id")
        SELECT r.id, p.id
        FROM "roles" r
        CROSS JOIN "permissions" p
        WHERE r.name IN ('ADMIN', 'MANAGEMENT')
          AND p.resource IN ('design_standard', 'design_load', 'design_system')
        ON CONFLICT DO NOTHING;
      `);
      await ds.query(`
        INSERT INTO "role_permissions" ("role_id", "permission_id")
        SELECT r.id, p.id
        FROM "roles" r
        CROSS JOIN "permissions" p
        WHERE r.name IN ('DESIGN', 'PLANNING')
          AND p.resource IN ('design_standard', 'design_load', 'design_system')
          AND p.action IN ('read', 'create', 'update', 'estimate')
        ON CONFLICT DO NOTHING;
      `);
      console.log(`✓ ${db} role_permissions synced`);
      await ds.destroy();
    } catch (e) {
      console.error(`Error on ${db}:`, e);
    }
  }
}

main();
