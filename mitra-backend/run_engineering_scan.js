const { Client } = require('pg');
const dotenv = require('dotenv');
const { EngineeringFileIndexerService } = require('./dist/modules/engineering-file-indexer/services/engineering-file-indexer.service');
const { EngineeringFileIndex } = require('./dist/modules/engineering-file-indexer/entities/engineering-file-index.entity');
const { ToolMaster } = require('./dist/modules/tool-master/entities/tool-master.entity');
const { DataSource } = require('typeorm');

dotenv.config();
(async () => {
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
  await service.scanAndIndex(null);
  const count = await indexRepo.count({ where: { deletedAt: null } });
  const samples = await indexRepo.find({ where: { deletedAt: null, toolNo: ['BM450','BM458','BM475'] }, order: { toolNo: 'ASC', relativePath: 'ASC' }, take: 20 });
  console.log(JSON.stringify({ count, samples: samples.map((row) => ({ toolNo: row.toolNo, fileName: row.fileName, relativePath: row.relativePath })) }));
  await ds.destroy();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
