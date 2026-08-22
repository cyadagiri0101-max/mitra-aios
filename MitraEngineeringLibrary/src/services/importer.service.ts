import fs from 'fs';
import path from 'path';
import { DataSource } from 'typeorm';
import * as XLSX from 'xlsx';
import { ImportContext } from '../entities/import-context.entity';

export class ImporterService {
  constructor(private dataSource: DataSource) {}

  async importWorkbook(filePath: string, revision?: string): Promise<void> {
    const workbook = XLSX.readFile(filePath);
    const fileName = path.basename(filePath);

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { header: 1, defval: '' });

      for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex] as unknown[];
        const context = this.dataSource.getRepository(ImportContext).create({
          sourceFile: fileName,
          worksheet: sheetName,
          rowNumber: rowIndex + 1,
          revision: revision || null,
        });
        await this.dataSource.getRepository(ImportContext).save(context);
      }
    }
  }

  async importEngineeringTextFile(filePath: string, revision?: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const context = this.dataSource.getRepository(ImportContext).create({
      sourceFile: path.basename(filePath),
      worksheet: null,
      rowNumber: null,
      revision: revision || null,
    });
    await this.dataSource.getRepository(ImportContext).save(context);

    const documentRepository = this.dataSource.getRepository('engineering_document');
    await documentRepository.insert({
      filename: path.basename(filePath),
      content,
      sourceFile: path.basename(filePath),
      worksheet: null,
      rowNumber: null,
      revision: revision || null,
    });
  }
}
