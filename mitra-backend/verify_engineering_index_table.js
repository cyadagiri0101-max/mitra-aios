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
  const table = await client.query("SELECT to_regclass('public.engineering_file_index') as exists");
  console.log(JSON.stringify(table.rows));
  await client.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
