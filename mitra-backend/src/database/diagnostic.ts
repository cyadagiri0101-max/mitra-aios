import { AppDataSource } from './data-source';

async function runDiagnostics() {
  try {
    await AppDataSource.initialize();
    console.log('\n=== DIAGNOSTIC QUERIES ===\n');

    // Query 1: Users
    console.log('1️⃣  USERS:');
    const users = await AppDataSource.query(`
      SELECT id, email, tenant_id, role_id
      FROM users
      WHERE email = 'admin@mitra.local'
    `);
    console.table(users);
    const adminUser = users[0];

    // Query 2: Projects
    console.log('\n2️⃣  PROJECTS (all):');
    const allProjects = await AppDataSource.query(`
      SELECT id, name, tenant_id, created_by, deleted_at
      FROM projects
      LIMIT 10
    `);
    console.table(allProjects);

    // Query 3: Check if admin's tenant projects exist
    if (adminUser) {
      console.log(`\n3️⃣  PROJECTS matching admin's tenant (${adminUser.tenant_id}):`);
      const tenantProjects = await AppDataSource.query(`
        SELECT COUNT(*) as count
        FROM projects
        WHERE tenant_id = $1
      `, [adminUser.tenant_id]);
      console.table(tenantProjects);

      // Query 4: Check total projects
      console.log('\n4️⃣  TOTAL PROJECTS in DB:');
      const totalProjects = await AppDataSource.query(`
        SELECT COUNT(*) as count
        FROM projects
      `);
      console.table(totalProjects);

      // Query 5: Projects with NULL tenant_id
      console.log('\n5️⃣  PROJECTS with NULL tenant_id:');
      const nullTenantProjects = await AppDataSource.query(`
        SELECT COUNT(*) as count
        FROM projects
        WHERE tenant_id IS NULL
      `);
      console.table(nullTenantProjects);

      // Query 6: Detailed project info
      console.log('\n6️⃣  DETAILED PROJECT INFO (all, limit 5):');
      const detailedProjects = await AppDataSource.query(`
        SELECT 
          id,
          name,
          tenant_id,
          created_by,
          deleted_at,
          created_at,
          stage
        FROM projects
        ORDER BY created_at DESC
        LIMIT 5
      `);
      console.table(detailedProjects);
    }

    console.log('\n=== END DIAGNOSTICS ===\n');
  } catch (err) {
    console.error('Error running diagnostics:', err);
  } finally {
    await AppDataSource.destroy();
  }
}

runDiagnostics().catch(console.error);
