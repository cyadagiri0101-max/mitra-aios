import { createConnection } from 'typeorm';
import { ToolMaster } from '../entities/tool-master.entity';
import { readFileSync } from 'fs';
import path from 'path';

interface ImportRecord {
  toolNo: string;
  projectName: string;
  toolType: 'BM' | 'IM';
}

export async function importToolMasterFromJson(filePath: string, tenantId: string, userId: string) {
  const absolutePath = path.resolve(filePath);
  const raw = readFileSync(absolutePath, 'utf8');
  const records = JSON.parse(raw) as ImportRecord[];

  const connection = await createConnection({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'mitra_admin',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'mitra_v2',
    entities: [ToolMaster],
    synchronize: false,
  });

  const repo = connection.getRepository(ToolMaster);
  for (const record of records) {
    const entity = repo.create({
      toolNo: record.toolNo,
      toolType: record.toolType,
      projectName: record.projectName,
      tenantId,
      createdBy: userId,
      updatedBy: userId,
    });
    await repo.save(entity).catch(() => undefined);
  }

  await connection.close();
  return { imported: records.length };
}
