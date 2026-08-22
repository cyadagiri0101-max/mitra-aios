import { DataSource } from 'typeorm';
import { AppDataSourceOptions } from '../src/database/data-source';
import { ImporterService } from '../src/services/importer.service';
import fs from 'fs';
import path from 'path';

describe('ImporterService', () => {
  let dataSource: DataSource;
  let importer: ImporterService;
  const sampleDir = path.join(__dirname, 'sample-data');
  const sampleFile = path.join(sampleDir, 'TestWorkbook.xlsx');

  beforeAll(async () => {
    dataSource = new DataSource({ ...AppDataSourceOptions, database: 'postgres', synchronize: true, logging: false });
    await dataSource.initialize();
    importer = new ImporterService(dataSource);
    if (!fs.existsSync(sampleDir)) {
      fs.mkdirSync(sampleDir, { recursive: true });
    }
    const workbook = { SheetNames: ['Sheet1'], Sheets: { Sheet1: { A1: { v: 'Header' }, A2: { v: 'Value' }, '!ref': 'A1:A2' } } };
    const XLSX = require('xlsx');
    XLSX.writeFile(workbook, sampleFile);
  });

  afterAll(async () => {
    await dataSource.destroy();
    fs.rmSync(sampleDir, { recursive: true, force: true });
  });

  it('imports workbook rows into import_context', async () => {
    await importer.importWorkbook(sampleFile, 'test-revision');
    const result = await dataSource.getRepository('import_context').find();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toEqual(expect.objectContaining({ sourceFile: 'TestWorkbook.xlsx', worksheet: 'Sheet1', revision: 'test-revision' }));
  });
});
