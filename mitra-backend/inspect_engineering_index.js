const { Client } = require('pg');
const dotenv = require('dotenv');
const { DataSource } = require('typeorm');
const { EngineeringFileIndexerService } = require('./dist/modules/engineering-file-indexer/services/engineering-file-indexer.service');
const { EngineeringFileIndex } = require('./dist/modules/engineering-file-indexer/entities/engineering-file-index.entity');
const { ToolMaster } = require('./dist/modules/tool-master/entities/tool-master.entity');

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
  const tools = await client.query("SELECT tool_no, tool_type, project_name FROM tool_master WHERE deleted_at IS NULL AND (tool_no ILIKE 'BM%' OR tool_no ILIKE 'IM%') ORDER BY tool_no LIMIT 50");
  console.log(JSON.stringify({ toolCount: tools.rows.length, tools: tools.rows }));
  const existing = await client.query("SELECT tool_no, file_name, relative_path FROM engineering_file_index WHERE deleted_at IS NULL AND tool_no IN ('BM450','BM458','BM475') ORDER BY tool_no, relative_path LIMIT 20");
  console.log(JSON.stringify({ existingSamples: existing.rows }));
  await client.end();

  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'mitra_admin',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'mitra_v2',
    entities: [EngineeringFileIndex, ToolMaster],
    synchronize: false,
  });
  await ds.initialize();
  const indexRepo = ds.getRepository(EngineeringFileIndex);
  const toolRepo = ds.getRepository(ToolMaster);
  const service = new EngineeringFileIndexerService(indexRepo, toolRepo);
  const result = await service.scanAndIndex(null);
  const rows = await indexRepo.find({ where: { deletedAt: null }, order: { toolNo: 'ASC', relativePath: 'ASC' }, take: 20 });
  console.log(JSON.stringify({ scanResult: result, sampleRows: rows.map((row) => ({ toolNo: row.toolNo, fileName: row.fileName, relativePath: row.relativePath })) }));
  await ds.destroy();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
