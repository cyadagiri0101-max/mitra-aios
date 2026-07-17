/**
 * Test script: Verify Project CRUD workflow after tenantId fix
 * 
 * Steps:
 * 1. Query admin user details
 * 2. Create a test project
 * 3. Verify tenant_id is set correctly
 * 4. Query GET /api/project to verify it returns the project
 */
import axios from 'axios';
import { createConnection } from 'typeorm';

const API_URL = 'http://localhost:3001/api';
const DB_CONFIG = {
  type: 'postgres' as const,
  host: 'localhost',
  port: 5432,
  username: 'mitra_admin',
  password: '36bf05cc734b59e539c646fd4ef4e8bf0e72137d0164d8d4',
  database: 'mitra_v2',
};

interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
}

async function main() {
  console.log('\n=== PROJECT CRUD TEST AFTER TENANTID FIX ===\n');

  // 1. Login
  console.log('1️⃣ Logging in as admin@mitra.local...');
  const loginRes = await axios.post<AuthResponse>(`${API_URL}/auth/login`, {
    email: 'admin@mitra.local',
    password: 'AdminPassword123',
  });
  const token = loginRes.data.accessToken;
  console.log(`   ✅ Token received: ${token.substring(0, 50)}...`);

  // 2. Get admin user details
  console.log('\n2️⃣ Querying admin user and tenant...');
  const connection = await createConnection({
    ...DB_CONFIG,
    entities: [],
    synchronize: false,
  });
  const adminRes = await connection.query(
    `SELECT id, email, tenant_id FROM users WHERE email = 'admin@mitra.local' LIMIT 1`
  );
  const admin = adminRes[0];
  console.log(`   Admin ID: ${admin.id}`);
  console.log(`   Tenant ID: ${admin.tenant_id}`);

  // 3. Delete old test projects for clean slate
  console.log('\n3️⃣ Cleaning up old test projects...');
  const cleanRes = await connection.query(
    `DELETE FROM projects WHERE name LIKE 'TEST_CRUD_%'`
  );
  console.log(`   Deleted ${cleanRes.length} old test records`);

  // 4. Create a new project
  console.log('\n4️⃣ Creating new project via POST /api/project...');
  const projectName = `TEST_CRUD_${Date.now()}`;
  const createRes = await axios.post(
    `${API_URL}/project`,
    {
      name: projectName,
      description: 'Test CRUD workflow - verifying tenant_id is set',
      customerId: null,
      quotation: null,
      currency: 'INR',
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const createdProject = createRes.data;
  console.log(`   ✅ Status: ${createRes.status}`);
  console.log(`   Project ID: ${createdProject.id}`);
  console.log(`   Project Name: ${createdProject.name}`);
  console.log(`   Project Number: ${createdProject.projectNumber}`);

  // 5. Verify tenant_id in database
  console.log('\n5️⃣ Verifying tenant_id in database...');
  const dbRes = await connection.query(
    `SELECT id, name, project_number, tenant_id, created_by FROM projects WHERE id = $1`,
    [createdProject.id]
  );
  if (dbRes.length === 0) {
    console.log('   ❌ ERROR: Project not found in database!');
    process.exit(1);
  }
  const dbProject = dbRes[0];
  console.log(`   DB Project ID: ${dbProject.id}`);
  console.log(`   DB Name: ${dbProject.name}`);
  console.log(`   DB Project Number: ${dbProject.project_number}`);
  console.log(`   DB tenant_id: ${dbProject.tenant_id}`);
  console.log(`   DB created_by: ${dbProject.created_by}`);

  if (dbProject.tenant_id === null) {
    console.log('\n   ❌ FAILED: tenant_id is still NULL!');
    process.exit(1);
  }
  if (dbProject.tenant_id !== admin.tenant_id) {
    console.log(`\n   ❌ FAILED: tenant_id mismatch!`);
    console.log(`      Expected: ${admin.tenant_id}`);
    console.log(`      Got: ${dbProject.tenant_id}`);
    process.exit(1);
  }
  console.log(`   ✅ tenant_id matches admin's tenant!`);

  // 6. Query via API GET
  console.log('\n6️⃣ Querying project list via GET /api/project...');
  const listRes = await axios.get(`${API_URL}/project`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const projects = listRes.data.data || listRes.data;
  console.log(`   Total projects returned: ${Array.isArray(projects) ? projects.length : 1}`);

  const foundProject = Array.isArray(projects)
    ? projects.find((p: any) => p.id === createdProject.id)
    : projects.id === createdProject.id
    ? projects
    : null;

  if (!foundProject) {
    console.log('   ❌ ERROR: Project not found in GET response!');
    console.log(`   Expected project ID: ${createdProject.id}`);
    console.log(`   Response:`, JSON.stringify(listRes.data, null, 2));
    process.exit(1);
  }
  console.log(`   ✅ Project found in list!`);
  console.log(`      Name: ${foundProject.name}`);
  console.log(`      Project Number: ${foundProject.projectNumber}`);

  // 7. Update project
  console.log('\n7️⃣ Updating project...');
  const updateRes = await axios.put(
    `${API_URL}/project/${createdProject.id}`,
    {
      name: `${projectName}_UPDATED`,
      description: 'Updated description',
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  console.log(`   ✅ Update status: ${updateRes.status}`);
  console.log(`   Updated name: ${updateRes.data.name}`);

  // 8. Verify update in database
  const updateDbRes = await connection.query(
    `SELECT name, updated_by FROM projects WHERE id = $1`,
    [createdProject.id]
  );
  console.log(`   DB updated_by: ${updateDbRes[0].updated_by}`);
  if (updateDbRes[0].updated_by !== admin.id) {
    console.log('   ⚠️  Warning: updated_by not set correctly');
  } else {
    console.log('   ✅ updated_by set correctly');
  }

  // 9. Delete project (soft delete)
  console.log('\n8️⃣ Deleting project...');
  const deleteRes = await axios.delete(`${API_URL}/project/${createdProject.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   ✅ Delete status: ${deleteRes.status}`);

  // 10. Verify soft delete
  const deleteDbRes = await connection.query(
    `SELECT id, deleted_at FROM projects WHERE id = $1`,
    [createdProject.id]
  );
  if (deleteDbRes[0].deleted_at === null) {
    console.log('   ❌ ERROR: deleted_at not set (soft delete failed)!');
    process.exit(1);
  }
  console.log(`   ✅ Soft delete verified (deleted_at set)`);

  // 11. Verify project is removed from list
  const finalListRes = await axios.get(`${API_URL}/project`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const finalProjects = finalListRes.data.data || finalListRes.data;
  const deletedProjectFound = Array.isArray(finalProjects)
    ? finalProjects.find((p: any) => p.id === createdProject.id)
    : finalProjects.id === createdProject.id
    ? finalProjects
    : null;

  if (deletedProjectFound) {
    console.log('   ❌ ERROR: Deleted project still appears in list!');
    process.exit(1);
  }
  console.log(`   ✅ Deleted project removed from list`);

  console.log('\n=== ✅ ALL PROJECT CRUD TESTS PASSED ===\n');

  await connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ TEST FAILED:', err.message);
  if (err.response?.data) {
    console.error('Response:', err.response.data);
  }
  process.exit(1);
});
