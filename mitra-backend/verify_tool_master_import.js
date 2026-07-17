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
  const total = await client.query('SELECT COUNT(*) AS count FROM tool_master WHERE deleted_at IS NULL');
  const samples = await client.query(
    "SELECT tool_no, tool_type, project_name FROM tool_master WHERE deleted_at IS NULL AND tool_no IN ('BM450','BM458','BM475','IM101') ORDER BY tool_no"
  );
  console.log(JSON.stringify({ total: Number(total.rows[0].count), samples: samples.rows }));
  await client.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
