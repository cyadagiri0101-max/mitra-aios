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
  const res = await client.query("SELECT to_regclass('public.tool_master') as table_exists;");
  console.log(JSON.stringify(res.rows));
  const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='tool_master' ORDER BY ordinal_position");
  console.log(JSON.stringify(cols.rows));
  await client.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
