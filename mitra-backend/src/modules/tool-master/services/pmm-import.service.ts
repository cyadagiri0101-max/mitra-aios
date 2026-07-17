import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as path from 'path';
import { spawn } from 'child_process';
import { ToolMaster } from '../entities/tool-master.entity';

export interface ImportStats {
  imported: number;
  skippedDuplicates: number;
  invalidRows: number;
  categories: Record<string, number>;
  duplicates: Array<{ category: string; toolNo: string }>;
}

@Injectable()
export class PmmImportService {
  constructor(
    @InjectRepository(ToolMaster) private readonly repo: Repository<ToolMaster>,
    private readonly dataSource: DataSource,
  ) {}

  async importHistoricalPmm(tenantId: string, userId: string): Promise<ImportStats> {
    const pmmDbPath = path.resolve(process.cwd(), '..', 'pmm_data_library', 'pmm_database.db');
    const stats: ImportStats = {
      imported: 0,
      skippedDuplicates: 0,
      invalidRows: 0,
      categories: {},
      duplicates: [],
    };

    const categories = [
      { key: 'blow_molds', type: 'BM', table: 'blow_molds', toolColumn: 'Normalized_Project_No', projectColumn: 'Description', source: 'blow_molds' },
      { key: 'injection_molds', type: 'IM', table: 'injection_molds', toolColumn: 'Normalized_Project_No', projectColumn: 'Description', source: 'injection_molds' },
      { key: 'job_works', type: 'BM', table: 'job_works', toolColumn: 'Job_No', projectColumn: 'Project_Description', source: 'job_works' },
      { key: 'commercial_molds', type: 'BM', table: 'commercial_molds', toolColumn: 'Prathiraj_Mold_No', projectColumn: 'Description', source: 'commercial_molds' },
      { key: 'alpla_std_parts', type: 'BM', table: 'alpla_std_parts', toolColumn: 'Normalized_Project_No', projectColumn: 'Description', source: 'alpla_std_parts' },
    ];

    await this.dataSource.transaction(async (manager) => {
      for (const category of categories) {
        const rows: any[] = await new Promise((resolve, reject) => {
          const python = spawn(process.env.PYTHON || 'python.exe', ['-c', `import sqlite3, json, sys; conn=sqlite3.connect(r'${pmmDbPath}'); cur=conn.cursor(); cur.execute("SELECT * FROM ${category.table}"); rows=cur.fetchall(); cols=[d[0] for d in cur.description]; print(json.dumps([dict(zip(cols, row)) for row in rows])) ; conn.close()`]);
          let output = '';
          python.stdout.on('data', (chunk) => { output += chunk.toString(); });
          python.stderr.on('data', (chunk) => { output += chunk.toString(); });
          python.on('close', (code) => {
            if (code !== 0) reject(new Error(output));
            else {
              try { resolve(JSON.parse(output)); } catch (err) { reject(err); }
            }
          });
        });

        stats.categories[category.key] = rows.length;
        for (const row of rows) {
          const toolNo = row[category.toolColumn]?.toString()?.trim();
          const projectName = row[category.projectColumn]?.toString()?.trim() || null;

          if (!toolNo) {
            stats.invalidRows += 1;
            continue;
          }

          const existing = await manager.getRepository(ToolMaster).findOne({ where: { toolNo, tenantId } });
          if (existing) {
            stats.skippedDuplicates += 1;
            stats.duplicates.push({ category: category.key, toolNo });
            continue;
          }

          const entity = manager.getRepository(ToolMaster).create({
            toolNo,
            toolType: category.type,
            projectName,
            customerName: null,
            productName: null,
            machine: null,
            cavity: null,
            status: null,
            revision: null,
            description: null,
            tenantId,
            createdBy: userId,
            updatedBy: userId,
          });
          await manager.getRepository(ToolMaster).save(entity);
          stats.imported += 1;
        }
      }
    });

    return stats;
  }
}
