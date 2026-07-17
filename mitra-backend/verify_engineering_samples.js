const { Client } = require('pg');
const { DataSource } = require('typeorm');
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
  const rows = await client.query("SELECT id, tool_no, item_type, file_name, relative_path FROM engineering_file_index WHERE deleted_at IS NULL AND tool_no IN ('BM450','BM458','BM475','BM480') ORDER BY tool_no, relative_path");
  const counts = await client.query("SELECT tool_no, item_type, count(*)::int AS count FROM engineering_file_index WHERE deleted_at IS NULL AND tool_no IN ('BM450','BM458','BM475','BM480') GROUP BY tool_no, item_type ORDER BY tool_no, item_type");
  const total = await client.query("SELECT count(*)::int AS total, count(*) FILTER (WHERE item_type = 'folder')::int AS folders, count(*) FILTER (WHERE item_type = 'file')::int AS files FROM engineering_file_index WHERE deleted_at IS NULL");
  await client.end();

  const { EngineeringFileIndexController } = require('./dist/modules/engineering-file-indexer/controllers/engineering-file-indexer.controller');
  const { EngineeringFileIndexerService } = require('./dist/modules/engineering-file-indexer/services/engineering-file-indexer.service');
  const { EngineeringFileIndex } = require('./dist/modules/engineering-file-indexer/entities/engineering-file-index.entity');
  const { ToolMaster } = require('./dist/modules/tool-master/entities/tool-master.entity');
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'mitra_admin',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'mitra_v2',
    entities: [EngineeringFileIndex, ToolMaster],
    synchronize: false,
  });
  await dataSource.initialize();
  const service = new EngineeringFileIndexerService(
    dataSource.getRepository(EngineeringFileIndex),
    dataSource.getRepository(ToolMaster),
  );
  const controller = new EngineeringFileIndexController(service);
  const getRows = (
    await Promise.all(['BM450', 'BM458', 'BM475', 'BM480'].map((toolNo) => controller.list(toolNo, undefined, undefined)))
  ).flat();
  await dataSource.destroy();

  const byTool = {};
  for (const row of counts.rows) {
    byTool[row.tool_no] = byTool[row.tool_no] || { folder: 0, file: 0, total: 0 };
    byTool[row.tool_no][row.item_type] = row.count;
    byTool[row.tool_no].total += row.count;
  }
  const dbIds = new Set(rows.rows.map((row) => row.id));
  const getIds = new Set(getRows.map((row) => row.id));
  console.log(JSON.stringify({
    total: total.rows[0],
    counts: byTool,
    getEngineeringFileIndex: {
      count: getRows.length,
      sameRecords: getRows.length === rows.rows.length && [...dbIds].every((id) => getIds.has(id)),
    },
  }));
})().catch((err) => {
  console.error(JSON.stringify({ code: err.code, path: err.path, syscall: err.syscall, message: err.message }));
  process.exit(1);
});
