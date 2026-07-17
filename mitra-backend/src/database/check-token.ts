import { AppDataSource } from './data-source';

async function checkToken() {
  try {
    await AppDataSource.initialize();
    console.log('\n=== CHECKING JWT PAYLOAD ===\n');

    // Get the token-related data from users table
    const users = await AppDataSource.query(`
      SELECT 
        id,
        email,
        tenant_id,
        role_id
      FROM users
      WHERE email = 'admin@mitra.local'
    `);

    if (users.length === 0) {
      console.log('❌ Admin user not found');
      return;
    }

    const user = users[0];
    console.log('✅ Admin User:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Tenant ID: ${user.tenant_id}`);
    console.log(`   Role ID: ${user.role_id}`);

    // Get role name
    const roles = await AppDataSource.query(`
      SELECT id, name FROM roles WHERE id = $1
    `, [user.role_id]);

    if (roles.length > 0) {
      console.log(`   Role Name: ${roles[0].name}`);
    }

    console.log('\n📝 JWT Payload should be:');
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      role: roles.length > 0 ? roles[0].name : null,
      permissions: [],
    };
    console.log(JSON.stringify(payload, null, 2));

    console.log('\n=== END CHECK ===\n');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await AppDataSource.destroy();
  }
}

checkToken().catch(console.error);
