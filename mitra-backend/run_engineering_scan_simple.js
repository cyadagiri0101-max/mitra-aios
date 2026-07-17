const { DataSource } = require('typeorm');
const { Logger } = require('@nestjs/common');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();
Logger.overrideLogger(['log', 'warn', 'error']);

(async () => {
  const toolNo = process.argv[2]?.trim();
  if (!toolNo || toolNo === '--all') {
    throw new Error('Pass a single tool number, for example: node run_engineering_scan_simple.js BM450');
  }
  const distPath = path.resolve(__dirname, 'dist/modules/engineering-file-indexer/services/engineering-file-indexer.service.js');
  const serviceModule = require(distPath);
  const { EngineeringFileIndexerService } = serviceModule;
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
  const indexRepo = dataSource.getRepository(EngineeringFileIndex);
  const toolRepo = dataSource.getRepository(ToolMaster);
  const service = new EngineeringFileIndexerService(indexRepo, toolRepo);
  const startedAt = new Date();
  const result = await service.scanAndIndex(null, { toolNo });
  const total = await indexRepo
    .createQueryBuilder('index')
    .select('COUNT(*)::int', 'total')
    .addSelect("COUNT(*) FILTER (WHERE index.itemType = 'folder')::int", 'folders')
    .addSelect("COUNT(*) FILTER (WHERE index.itemType = 'file')::int", 'files')
    .where('index.deletedAt IS NULL')
    .getRawOne();
  const counts = await indexRepo
    .createQueryBuilder('index')
    .select('index.toolNo', 'toolNo')
    .addSelect('index.itemType', 'itemType')
    .addSelect('COUNT(*)::int', 'count')
    .where('index.deletedAt IS NULL')
    .andWhere('index.toolNo = :toolNo', { toolNo })
    .groupBy('index.toolNo')
    .addGroupBy('index.itemType')
    .orderBy('index.toolNo', 'ASC')
    .addOrderBy('index.itemType', 'ASC')
    .getRawMany();
  const output = { toolNo, startedAt, finishedAt: new Date(), result, total, counts };
  fs.writeFileSync(path.resolve(__dirname, 'engineering_scan_result.json'), JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output));
  await dataSource.destroy();
})().catch((err) => {
  fs.writeFileSync(path.resolve(__dirname, 'engineering_scan_result.json'), JSON.stringify({
    failedAt: new Date(),
    code: err.code,
    path: err.path,
    syscall: err.syscall,
    message: err.message,
  }, null, 2));
  console.error(JSON.stringify({ code: err.code, path: err.path, syscall: err.syscall, message: err.message }));
  process.exit(1);
});
