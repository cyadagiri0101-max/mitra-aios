const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();
(async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || 'mitra_admin',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'mitra_v2',
  });
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS tool_master (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz,
      created_by uuid,
      updated_by uuid,
      tenant_id uuid,
      tool_no varchar(50) NOT NULL UNIQUE,
      tool_type varchar(20) NOT NULL,
      project_name varchar(200),
      customer_name varchar(200),
      product_name varchar(200),
      machine varchar(100),
      cavity varchar(50),
      status varchar(50),
      revision varchar(20),
      description text
    );
    CREATE INDEX IF NOT EXISTS idx_tool_master_tenant_id ON tool_master(tenant_id) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_tool_master_tool_type ON tool_master(tool_type) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_tool_master_project_name ON tool_master(project_name) WHERE deleted_at IS NULL;
  `);
  console.log('tool_master created');
  await client.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
