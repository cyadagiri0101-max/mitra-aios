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
    CREATE TABLE IF NOT EXISTS engineering_file_index (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz,
      created_by uuid,
      updated_by uuid,
      tenant_id uuid,
      tool_no varchar(50) NOT NULL,
      item_type varchar(20) NOT NULL DEFAULT 'file',
      folder_name varchar(255) NOT NULL,
      folder_path varchar(1000) NOT NULL,
      relative_path varchar(2000) NOT NULL,
      parent_relative_path varchar(2000),
      unc_path varchar(4000) NOT NULL UNIQUE,
      file_name varchar(255) NOT NULL,
      extension varchar(50),
      size_bytes bigint NOT NULL,
      last_modified_at timestamptz NOT NULL
    );
    ALTER TABLE engineering_file_index ADD COLUMN IF NOT EXISTS item_type varchar(20) NOT NULL DEFAULT 'file';
    ALTER TABLE engineering_file_index ADD COLUMN IF NOT EXISTS parent_relative_path varchar(2000);
    CREATE INDEX IF NOT EXISTS idx_engineering_file_index_tenant_del ON engineering_file_index(tenant_id, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_engineering_file_index_tool_no ON engineering_file_index(tool_no, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_engineering_file_index_tool_path ON engineering_file_index(tool_no, relative_path, deleted_at);
  `);
  console.log('engineering_file_index created');
  await client.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
