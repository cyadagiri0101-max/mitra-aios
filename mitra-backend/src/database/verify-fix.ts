/**
 * Simple verification: Check if tenant_id is now being set correctly
 */
import { createConnection } from 'typeorm';

const DB_CONFIG = {
  type: 'postgres' as const,
  host: 'localhost',
  port: 5432,
  username: 'mitra_admin',
  password: '36bf05cc734b59e539c646fd4ef4e8bf0e72137d0164d8d4',
  database: 'mitra_v2',
};

async function main() {
  const connection = await createConnection({
    ...DB_CONFIG,
    entities: [],
    synchronize: false,
  });

  try {
    // Clean up
    console.log('🧹 Cleaning up old test projects...');
    await connection.query(`DELETE FROM projects WHERE name LIKE 'VERIFY_%'`);

    // Get admin info
    console.log('\n👤 Getting admin user info...');
    const adminRes = await connection.query(
      `SELECT id, email, tenant_id FROM users WHERE email = 'admin@mitra.local' LIMIT 1`
    );
    if (adminRes.length === 0) {
      console.log('❌ Admin user not found!');
      process.exit(1);
    }
    const admin = adminRes[0];
    console.log(`   Admin ID: ${admin.id}`);
    console.log(`   Tenant ID: ${admin.tenant_id}`);

    // Check old broken projects (tenant_id = NULL)
    console.log('\n🔍 Checking for any projects with tenant_id = NULL...');
    const brokenRes = await connection.query(
      `SELECT COUNT(*)::int as count FROM projects WHERE tenant_id IS NULL AND deleted_at IS NULL`
    );
    const brokenCount = brokenRes[0]?.count || 0;
    console.log(`   Found: ${brokenCount} projects with NULL tenant_id`);
    if (brokenCount > 0) {
      console.log('   ⚠️  This suggests the old bug may still exist');
    }

    console.log('\n✅ Database verification complete');
    console.log(`   Admin tenant_id: ${admin.tenant_id}`);
    console.log(`   Use this in your API tests to verify projects are created with correct tenant_id`);

  } finally {
    await connection.close();
  }
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
