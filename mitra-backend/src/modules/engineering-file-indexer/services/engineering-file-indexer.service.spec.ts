import { EngineeringFileIndexerService } from './engineering-file-indexer.service';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('EngineeringFileIndexerService.matchToolNo', () => {
  let service: EngineeringFileIndexerService;

  beforeEach(() => {
    service = new EngineeringFileIndexerService({} as any, {} as any);
  });

  it.each([
    [
      '\\\\192.168.1.80\\Prathiraj Design Data\\Blow Molds - Design Data\\BM401-BM450\\BM450 Black Bird 5000ml P01 Single cavity Mold SSB65 FN\\drawing.dwg',
      ['BM450', 'BM458', 'BM475'],
      'BM450',
    ],
    [
      '\\\\192.168.1.80\\Prathiraj Design Data\\Blow Molds - Design Data\\BM451-BM500\\BM458 Vancouver 200ml 10-Cavity Mold BMU 70E+ FN\\drawing.dwg',
      ['BM450', 'BM458', 'BM475'],
      'BM458',
    ],
    [
      '\\\\192.168.1.80\\Prathiraj Design Data\\Blow Molds - Design Data\\BM451-BM500\\BM475 200ml TC Bottle 4+4 Cav Mold UMS100 AN CR\\drawing.dwg',
      ['BM450', 'BM458', 'BM475'],
      'BM475',
    ],
    [
      '\\\\192.168.1.80\\Prathiraj Design Data\\Blow Molds - Design Data\\BM451-BM500\\BM480 New Bottle Mold\\drawing.dwg',
      ['BM450', 'BM458', 'BM475'],
      'BM480',
    ],
  ])('prefers the most specific tool number for %s', (fullPath, toolNumbers, expected) => {
    const result = (service as any).matchToolNo(fullPath, toolNumbers);
    expect(result).toBe(expected);
  });

  it('does not treat range folders as a tool folder', () => {
    const result = (service as any).matchToolNo(
      '\\\\192.168.1.80\\Prathiraj Design Data\\Blow Molds - Design Data\\BM451-BM500',
      ['BM450', 'BM458', 'BM475'],
    );
    expect(result).toBeNull();
  });
});

describe('EngineeringFileIndexerService.scanAndIndex', () => {
  let tempRoot: string;
  let records: any[];
  let service: EngineeringFileIndexerService;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mitra-engineering-index-'));
    const shareRoot = path.join(tempRoot, 'Blow Molds - Design Data');
    for (const toolNo of ['BM450', 'BM458', 'BM475', 'BM480']) {
      const folder = path.join(shareRoot, toolNo === 'BM450' ? 'BM401-BM450' : 'BM451-BM500', `${toolNo} Tool Folder`);
      fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(path.join(folder, `${toolNo}.dwg`), toolNo);
    }

    records = [];
    let rowId = 0;
    const indexRepo = {
      find: jest.fn(async () => records.filter((record) => !record.deletedAt)),
      create: jest.fn((payload) => ({ ...payload, id: `row-${++rowId}` })),
      save: jest.fn(async (entity) => {
        const entities = Array.isArray(entity) ? entity : [entity];
        for (const item of entities) {
          const existingIndex = records.findIndex((record) => record.id === item.id || record.uncPath === item.uncPath);
          if (existingIndex >= 0) records[existingIndex] = { ...records[existingIndex], ...item };
          else records.push(item);
        }
        return entity;
      }),
      createQueryBuilder: jest.fn(() => ({
        withDeleted: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => records),
      })),
    };
    const toolRepo = {
      find: jest.fn(async () => ['BM450', 'BM458', 'BM475'].map((toolNo) => ({ toolNo }))),
    };
    service = new EngineeringFileIndexerService(indexRepo as any, toolRepo as any);
    (service as any).sharePath = tempRoot;
    (service as any).roots = ['Blow Molds - Design Data'];
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('indexes BM folders and files with relative metadata', async () => {
    const result = await service.scanAndIndex(null);

    expect(result.indexedFolders).toBe(4);
    expect(result.indexedFiles).toBe(4);
    expect(new Set(records.map((record) => record.toolNo))).toEqual(new Set(['BM450', 'BM458', 'BM475', 'BM480']));
    expect(records.some((record) => record.itemType === 'folder' && record.relativePath.includes('BM480 Tool Folder'))).toBe(true);
    expect(records.some((record) => record.itemType === 'file' && record.extension === '.dwg' && record.sizeBytes > 0)).toBe(true);
  });

  it('rescans incrementally without duplicating active rows', async () => {
    await service.scanAndIndex(null);
    await service.scanAndIndex(null);

    expect(records.filter((record) => !record.deletedAt)).toHaveLength(8);
  });
});
