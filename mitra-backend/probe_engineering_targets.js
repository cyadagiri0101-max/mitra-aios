const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const targets = ['BM450', 'BM458', 'BM475'];
const share = '\\192.168.1.80\Prathiraj Design Data';
const roots = ['Blow Molds - Design Data', 'Injection Molds - Design Data', 'Job Works', 'Mold Base - Design Data', 'IBM - Design Data'];

function walk(dir, results) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const text = full.toUpperCase();
    if (targets.some((t) => text.includes(t))) results.push(full);
    if (entry.isDirectory()) walk(full, results);
  }
}

(async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || 'mitra_admin',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'mitra_v2',
  });
  await client.connect();
  const toolRows = await client.query("SELECT tool_no, tool_type, project_name FROM tool_master WHERE deleted_at IS NULL AND (tool_no ILIKE 'BM%' OR tool_no ILIKE 'IM%') ORDER BY tool_no LIMIT 50");
  console.log(JSON.stringify({ toolRows: toolRows.rows.slice(0, 50) }));
  const indexRows = await client.query("SELECT tool_no, file_name, relative_path FROM engineering_file_index WHERE deleted_at IS NULL AND tool_no IN ('BM450','BM458','BM475') ORDER BY tool_no, relative_path LIMIT 20");
  console.log(JSON.stringify({ indexRows: indexRows.rows }));
  await client.end();

  const matches = [];
  for (const root of roots) {
    const full = path.join(share, root);
    if (fs.existsSync(full)) walk(full, matches);
  }
  console.log(JSON.stringify({ smbMatches: matches.slice(0, 100) }));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
